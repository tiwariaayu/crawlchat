import {
  Badge,
  GridItem,
  Group,
  Heading,
  IconButton,
  Input,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import { useState } from "react";
import type { Route } from "./+types/page";
import {
  TbCheck,
  TbCircleCheckFilled,
  TbMessage,
  TbTrash,
  TbWorld,
} from "react-icons/tb";
import { Link, redirect, useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import { getAuthUser } from "~/auth/middleware";
import { prisma } from "~/prisma";
import moment from "moment";
import type { Scrape } from "@prisma/client";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapes = await prisma.scrape.findMany({
    where: {
      userId: user?.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return {
    user,
    scrapes,
  };
}

export function meta() {
  return [
    {
      title: "LLM Ready",
      description: "Make your website ready for LLMs",
    },
  ];
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();

  if (request.method === "DELETE") {
    const id = formData.get("id");
    await prisma.scrape.delete({
      where: { id: id as string },
    });
    return null;
  }

  if (request.method === "POST") {
    const url = formData.get("url");
    const response = await fetch("http://localhost:3000/scrape", {
      method: "POST",
      body: JSON.stringify({ url }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 212) {
      throw redirect(`/chat?url=${url}`);
    }
  }
}

function ScrapeCard({
  scrape,
  onDelete,
  deleting,
}: {
  scrape: Scrape;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [deleteActive, setDeleteActive] = useState(false);

  useEffect(() => {
    if (deleteActive) {
      setTimeout(() => {
        setDeleteActive(false);
      }, 3000);
    }
  }, [deleteActive]);

  function handleDelete() {
    if (!deleteActive) {
      setDeleteActive(true);
      return;
    }
    onDelete();
  }

  return (
    <Stack bg="brand.gray.100" p={4} rounded={"lg"} h="full" className="group">
      <Group h={"30px"}>
        <Text fontSize={"30px"} _groupHover={{ display: "none" }}>
          <TbWorld />
        </Text>
        <Group h="full" display={"none"} _groupHover={{ display: "flex" }}>
          <IconButton size={"xs"} asChild>
            <Link to={`/threads/new?id=${scrape.id}`}>
              <TbMessage />
            </Link>
          </IconButton>
          <IconButton
            size={"xs"}
            variant={deleteActive ? "solid" : "subtle"}
            colorPalette={"red"}
            onClick={handleDelete}
          >
            {deleteActive ? <TbCheck /> : <TbTrash />}
          </IconButton>
        </Group>
      </Group>

      <Text fontSize={"sm"}>{scrape.url}</Text>
      <Group fontSize={"xs"}>
        <Text opacity={0.5}>{moment(scrape.createdAt).fromNow()}</Text>
        <Badge size={"xs"} variant={"surface"} colorPalette={"brand"}>
          <TbWorld />
          {scrape.urlCount}
        </Badge>
      </Group>
    </Stack>
  );
}

export default function LandingPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const socket = useRef<WebSocket>(null);
  const [scraping, setScraping] = useState<{
    url: string;
    remainingCount: number;
    scrapedCount: number;
  }>();
  const [stage, setStage] = useState<"idle" | "scraping" | "scraped" | "saved">(
    "idle"
  );
  const scrapeFetcher = useFetcher();
  const deleteFetcher = useFetcher();

  useEffect(() => {
    socket.current = new WebSocket("ws://localhost:3000");
    socket.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "scrape-pre") {
        setScraping({
          url: message.data.url,
          remainingCount: message.data.remainingUrlCount,
          scrapedCount: message.data.scrapedUrlCount,
        });
        setStage("scraping");
      } else if (message.type === "scrape-complete") {
        setStage("scraped");
      } else if (message.type === "saved") {
        setStage("saved");
      }
    };
  }, []);

  function handleDelete(id: string) {
    deleteFetcher.submit({ id }, { method: "delete" });
  }

  const loading =
    scrapeFetcher.state !== "idle" || ["scraping", "scraped"].includes(stage);

  return (
    <Stack
      alignItems={"center"}
      justifyContent={"center"}
      height={"100dvh"}
      gap={8}
    >
      <Stack w={"400px"}>
        <scrapeFetcher.Form method="post">
          <Stack>
            <Heading>Chat with any website!</Heading>
            <Group w="full">
              <Input
                placeholder="https://example.com"
                flex={1}
                name="url"
                disabled={loading}
              />
              <Button type="submit" loading={loading}>
                Scrape
                <TbCheck />
              </Button>
            </Group>
          </Stack>
        </scrapeFetcher.Form>

        <Stack fontSize={"sm"}>
          <Group justifyContent={"space-between"}>
            {stage === "scraping" && (
              <Text truncate>Scraping {scraping?.url}</Text>
            )}
            {scraping?.url && stage === "scraped" && (
              <Text>Scraping complete</Text>
            )}
            {scraping?.url && stage === "saved" && (
              <Group gap={1}>
                <Text>Done</Text>
                <Text color={"brand.fg"}>
                  <TbCircleCheckFilled />
                </Text>
              </Group>
            )}

            {scraping && (
              <Group>
                <Badge>
                  {scraping?.scrapedCount} /{" "}
                  {scraping?.scrapedCount + scraping?.remainingCount}
                </Badge>
              </Group>
            )}
          </Group>
        </Stack>
      </Stack>

      <Stack w={"400px"}>
        <SimpleGrid columns={2} gap={4}>
          {loaderData.scrapes.map((scrape) => (
            <GridItem key={scrape.id}>
              <ScrapeCard
                scrape={scrape}
                onDelete={() => handleDelete(scrape.id)}
                deleting={deleteFetcher.state !== "idle"}
              />
            </GridItem>
          ))}
        </SimpleGrid>
      </Stack>
    </Stack>
  );
}
