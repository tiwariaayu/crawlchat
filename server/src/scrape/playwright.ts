import { chromium, Page } from "playwright";

let page: Page | null = null;

async function getPage() {
  if (!page) {
    const browser = await chromium.launch();
    page = await browser.newPage();
  }
  return page;
}

export async function scrapePw(url: string) {
  const page = await getPage();
  console.log("Navigating to", url);
  await page.goto(url);
  console.log("Waiting for networkidle");
  await page.waitForLoadState("networkidle");
  console.log("Getting html");
  const html = await page.content();
  return html;
}
