import { Prisma, prisma } from "libs/prisma";
import { PLAN_FREE, activatePlan } from "libs/user-plan";
import { sendTeamJoinEmail, sendWelcomeEmail } from "~/email";
import { Resend } from "resend";
import { DodoPayments } from "dodopayments";
import { productIdPlanMap } from "~/payment/gateway-dodo";

export async function signUpNewUser(
  email: string,
  data?: { name?: string; photo?: string }
) {
  email = email.toLowerCase();
  let user = await prisma.user.findUnique({
    where: { email: email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: email,
        name: data?.name,
        photo: data?.photo,
        plan: {
          planId: PLAN_FREE.id,
          type: PLAN_FREE.type,
          provider: "CUSTOM",
          status: "ACTIVE",
          credits: PLAN_FREE.credits,
          limits: PLAN_FREE.limits,
          activatedAt: new Date(),
        },
        showOnboarding: true,
      },
    });

    const pendingScrapeUsers = await prisma.scrapeUser.findMany({
      where: {
        email: email,
        invited: true,
      },
      include: {
        scrape: true,
      },
    });

    for (const scrapeUser of pendingScrapeUsers) {
      await prisma.scrapeUser.update({
        where: {
          id: scrapeUser.id,
        },
        data: {
          invited: false,
          userId: user.id,
        },
      });

      await sendTeamJoinEmail(
        scrapeUser.email,
        user.email,
        scrapeUser.scrape.title ?? "CrawlChat"
      );
    }

    if (pendingScrapeUsers.length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          showOnboarding: false,
        },
      });
    }

    await sendWelcomeEmail(email);

    try {
      const resend = new Resend(process.env.RESEND_KEY);
      resend.contacts.create({
        email: email,
        firstName: user.name ?? "",
        lastName: "",
        unsubscribed: false,
        audienceId: "d9f508e2-deda-412a-a675-563b65052113",
      });
    } catch (e) {
      console.error("Error adding to audience", e);
    }
  }

  const update: Prisma.UserUpdateInput = {};
  if (data?.photo) {
    update.photo = data.photo;
  }
  if (!user.name && data?.name) {
    update.name = data.name;
  }

  if (Object.keys(update).length > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: update,
    });
  }

  try {
    const client = new DodoPayments({
      bearerToken: process.env.DODO_API_KEY!,
      environment: "live_mode",
    });

    const customerList = await client.customers.list({
      email: email,
    });
    const customer = customerList.items[0];

    if (customer) {
      const subscriptions = await client.subscriptions.list({
        customer_id: customer.customer_id,
      });

      const activeSubscription = subscriptions.items.find(
        (sub) => sub.status === "active"
      );

      if (activeSubscription && activeSubscription.product_id) {
        const plan = productIdPlanMap[activeSubscription.product_id];

        if (plan) {
          await activatePlan(user.id, plan, {
            provider: "DODO",
            subscriptionId: activeSubscription.subscription_id,
          });
        }
      }
    }
  } catch (e) {
    console.error("Error checking DodoPayments subscription", e);
  }

  return user;
}
