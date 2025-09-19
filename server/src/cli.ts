import dotenv from "dotenv";
import { SimpleAgent } from "./llm/agentic";
import { Flow } from "./llm/flow";
import { wsRateLimiter } from "./rate-limiter";
import { prisma } from "libs/prisma";
dotenv.config();

async function clearDataGaps() {
  const dataGapMessages = await prisma.message.findMany({
    where: {
      NOT: {
        analysis: {
          dataGapTitle: null,
        },
      },
    },
  });

  const messages = dataGapMessages.filter(
    (m) =>
      m.analysis?.dataGapTitle &&
      m.analysis?.dataGapDescription &&
      !m.analysis?.dataGapDone
  );

  for (const message of messages) {
    console.log("Updating message", message.id);
    await prisma.message.update({
      where: { id: message.id },
      data: { analysis: { dataGapTitle: null, dataGapDescription: null } },
    });
  }
}

async function main() {
  
}

console.log("Starting...");
main();
