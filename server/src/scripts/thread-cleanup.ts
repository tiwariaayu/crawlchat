import { prisma } from "libs/prisma";

function chunk<T>(array: T[], size: number): T[][] {
  return array.reduce((acc, _, i) => {
    const index = Math.floor(i / size);
    acc[index] = [...(acc[index] || []), array[i]];
    return acc;
  }, [] as T[][]);
}

export async function cleanupThreads() {
  const ago = new Date(Date.now());
  let threads = await prisma.thread.findMany({
    where: {
      createdAt: {
        lt: ago,
      },
    },
    include: {
      messages: true,
    },
  });

  threads = threads.filter((thread) => thread.messages.length === 0);
  console.log("Found", threads.length, "threads");

  const chunks = chunk(threads, 100);
  for (const chunk of chunks) {
    console.log("Deleting chunk", chunk.length, "threads");
    await prisma.thread.deleteMany({
      where: {
        id: { in: chunk.map((thread) => thread.id) },
      },
    });
  }
}

export async function cleanupMessages() {
  const TWO_MONTHS_AGO = new Date(Date.now() - 2 * 30 * 24 * 60 * 60 * 1000);
  const messages = await prisma.message.findMany({
    where: {
      createdAt: {
        lt: TWO_MONTHS_AGO,
      },
    },
    select: {
      id: true,
      thread: true,
    },
  });

  console.log("Found", messages.length, "messages");

  for (const msgsChunk of chunk(messages, 100)) {
    const filteredIds = msgsChunk
      .filter((m) => !m.thread.ticketKey)
      .map((m) => m.id);
    console.log("Deleting chunk", filteredIds.length, "messages");
    await prisma.message.deleteMany({
      where: {
        id: {
          in: filteredIds,
        },
      },
    });
  }
}
