// providers/claude.ts — Anthropic Claude provider

import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  _client = new Anthropic({ apiKey });
  return _client;
}

export async function callClaude(prompt: string): Promise<string> {
  const client = getClient();

  const res = await client.messages.create({
    model:      ANTHROPIC_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role:    "user",
        content: prompt,
      },
    ],
  });

  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("Claude returned no text block");
  return block.text;
}