// utils/n8nClient.ts — n8n webhook trigger service with retry

import axios, { type AxiosError } from "axios";
import { logger } from "./logger";

export interface N8nJobPayload {
  job_id:   string;
  file_url: string;
  ocr:      string;
  ai:       string;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1_000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Trigger the n8n OCR processing webhook (with retry) */
export async function triggerN8nWebhook(payload: N8nJobPayload): Promise<void> {
  const url    = process.env.N8N_WEBHOOK_URL ?? "";
  const secret = process.env.N8N_SECRET     ?? "";

  if (!url) {
    logger.warn("N8N_WEBHOOK_URL is not configured. Skipping webhook trigger.");
    return;
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
          "X-N8N-Secret": secret,
        },
        timeout: 10_000,
      });
      logger.info("n8n webhook triggered", { job_id: payload.job_id, attempt });
      return;
    } catch (err) {
      const axErr = err as AxiosError;
      lastError = axErr;
      const status = axErr.response?.status;

      logger.warn("n8n webhook attempt failed", {
        job_id: payload.job_id,
        attempt,
        status,
        message: axErr.message,
      });

      // Don't retry on client errors (4xx) — only on network/server errors
      if (status && status >= 400 && status < 500) {
        break;
      }

      if (attempt <= MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  const axErr = lastError as AxiosError;
  logger.error("n8n webhook failed after retries", {
    job_id: payload.job_id,
    status: axErr?.response?.status,
    message: axErr?.message,
  });
  throw new Error(`n8n trigger failed: ${axErr?.message ?? "Unknown error"}`);
}