// providers/ollama.ts — Ollama local LLM provider

import axios from "axios";

const OLLAMA_HOST  = process.env.OLLAMA_HOST  ?? "http://ollama:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3";

export interface OllamaResponse {
  model:    string;
  response: string;
  done:     boolean;
}

export async function callOllama(prompt: string): Promise<string> {
  const res = await axios.post<OllamaResponse>(
    `${OLLAMA_HOST}/api/generate`,
    {
      model:  OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0,       // deterministic output
        num_predict: 1024,
      },
    },
    { timeout: 120_000 }
  );

  if (!res.data?.response) {
    throw new Error("Ollama returned empty response");
  }

  return res.data.response;
}