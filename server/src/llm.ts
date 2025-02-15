import OpenAI from "openai";
import type { Message } from "@prisma/client";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askLLM(
  query: string,
  messages: Message[],
  options?: {
    url?: string;
    context?: string;
  }
) {
  return await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      ...messages.map((message) => message.llmMessage as any),
      {
        role: "system",
        content:
          "You are a helpful assistant that can answer questions about the context provided.",
      },
      {
        role: "user",
        content: `${query}\n\nContext:\n${options?.context ?? ""}`,
      },
    ],
    stream: true,
  });
}
