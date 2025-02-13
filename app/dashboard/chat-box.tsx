import {
  Box,
  GridItem,
  Group,
  Heading,
  IconButton,
  Input,
  Link,
  SimpleGrid,
} from "@chakra-ui/react";
import { Stack, Text } from "@chakra-ui/react";
import type { Message, ScrapeLink, Thread } from "@prisma/client";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { TbCheck, TbSend, TbTrash, TbWorld } from "react-icons/tb";
import Markdown from "react-markdown";
import { Prose } from "~/components/ui/prose";
import { getLinkTitle, getThreadName } from "~/thread-util";
import { sleep } from "~/util";
import { AppContext } from "./context";

function makeMessage(type: string, data: any) {
  return JSON.stringify({ type, data });
}

function LinkCard({ link }: { link: ScrapeLink }) {
  return (
    <Stack bg="brand.gray.100" p={2} rounded={"md"} h="full">
      <Link
        href={link.url}
        key={link.url}
        fontSize={"xs"}
        lineClamp={2}
        target="_blank"
      >
        {getLinkTitle(link)}
      </Link>
    </Stack>
  );
}

function AssistantMessage({
  content,
  links,
}: {
  content: string;
  links: ScrapeLink[];
}) {
  return (
    <Stack>
      <Prose w="full">
        <Markdown>{content}</Markdown>

        <SimpleGrid columns={3} gap={2}>
          {links.map((link, index) => (
            <GridItem key={index}>
              <LinkCard link={link} />
            </GridItem>
          ))}
        </SimpleGrid>
      </Prose>
    </Stack>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <Stack w="full" alignItems="flex-end">
      <Stack
        bg="brand.outline"
        p={4}
        rounded={"xl"}
        maxW="500px"
        w="fit-content"
        roundedBottomRight={0}
      >
        <Text>{content}</Text>
      </Stack>
    </Stack>
  );
}

export default function ChatBox({
  thread,
  deleting,
  onDelete,
}: {
  thread: Thread;
  deleting: boolean;
  onDelete: () => void;
}) {
  const { setThreadTitle } = useContext(AppContext);
  const socket = useRef<WebSocket>(null);
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>(thread.messages);
  const containerRef = useRef<HTMLDivElement>(null);
  const promptBoxRef = useRef<HTMLDivElement>(null);
  const [deleteActive, setDeleteActive] = useState(false);

  const title = useMemo(() => getThreadName(messages), [messages]);

  useEffect(() => {
    positionPromptBox();
    scrollToBottom(true);
  }, [messages]);

  useEffect(() => {
    socket.current = new WebSocket("ws://localhost:3000");
    socket.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "llm-chunk") {
        if (message.data.end) {
          setMessages((prev) => [
            ...prev,
            {
              llmMessage: {
                role: message.data.role,
                content: message.data.content,
              },
              links: message.data.links ?? [],
            },
          ]);
          setContent("");
          return;
        }
        setContent((prev) => prev + message.data.content);
        scrollToBottom();
      }
    };
  }, []);

  useEffect(() => {
    if (deleteActive) {
      setTimeout(() => {
        setDeleteActive(false);
      }, 3000);
    }
  }, [deleteActive]);

  useEffect(() => {
    setThreadTitle((titles) => ({
      ...titles,
      [thread.id]: title,
    }));
  }, [title]);

  async function handleAsk() {
    socket.current!.send(
      makeMessage("ask-llm", { threadId: thread.id, query })
    );
    setMessages((prev) => [
      ...prev,
      { llmMessage: { role: "user", content: query }, links: [] },
    ]);
    setQuery("");
    await sleep(0);
    scrollToBottom();
  }

  function positionPromptBox() {
    if (!containerRef.current) return;
    if (!promptBoxRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    promptBoxRef.current.style.left = `${rect.left}px`;
    promptBoxRef.current.style.width = `${rect.width}px`;
  }

  function scrollToBottom(force = false) {
    const height = document.body.scrollHeight;

    const scrollY = window.scrollY + window.innerHeight;
    const delta = height - scrollY;
    if (delta > 100 && !force) return;

    window.scrollTo({
      top: height,
      behavior: "smooth",
    });
  }

  function handleDelete() {
    if (!deleteActive) {
      setDeleteActive(true);
      return;
    }
    onDelete();
  }

  function allMessages() {
    const allMessages = [
      ...messages,
      ...(content
        ? [{ llmMessage: { role: "assistant", content }, links: [] }]
        : []),
    ];
    return allMessages.map((message) => ({
      role: (message.llmMessage as any).role,
      content: (message.llmMessage as any).content,
      links: message.links,
    }));
  }

  return (
    <Stack w={"full"} h="full" ref={containerRef}>
      <Stack>
        <Heading>{title}</Heading>
        <Group>
          <IconButton
            size={"xs"}
            variant={"subtle"}
            onClick={handleDelete}
            colorPalette={deleteActive || deleting ? "red" : undefined}
            disabled={deleting}
          >
            {deleteActive || deleting ? <TbCheck /> : <TbTrash />}
          </IconButton>
        </Group>
      </Stack>

      <Stack flex={1} pb={"60px"}>
        {allMessages().map((message, index) => (
          <Stack key={index}>
            {message.role === "assistant" ? (
              <AssistantMessage
                content={message.content}
                links={message.links}
              />
            ) : (
              <UserMessage content={message.content} />
            )}
          </Stack>
        ))}
      </Stack>

      <Group
        position={"fixed"}
        bottom={0}
        left={0}
        w="full"
        zIndex={1}
        ref={promptBoxRef}
        pb={8}
        bg="brand.white"
      >
        <Input
          placeholder="Ask your query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleAsk();
            }
          }}
        />
        <IconButton onClick={handleAsk}>
          <TbSend />
        </IconButton>
      </Group>
    </Stack>
  );
}
