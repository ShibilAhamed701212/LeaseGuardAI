// providers/openai.ts — OpenAI cloud provider

import OpenAI from "openai";

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  _client = new OpenAI({ apiKey });
  return _client;
}

export async function callOpenAI(prompt: string): Promise<string> {
  const client = getClient();

  const res = await client.chat.completions.create({
    model:       OPENAI_MODEL,
    temperature: 0,
    max_tokens:  1024,
    messages: [
      {
        role:    "system",
        content: "You are an expert financial contract analyzer. Return ONLY valid JSON. No markdown. No explanation.",
      },
      {
        role:    "user",
        content: prompt,
      },
    ],
  });

  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");
  return content;
}