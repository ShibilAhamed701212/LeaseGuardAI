// utils/n8nClient.ts — n8n webhook trigger service

import axios, { type AxiosError } from "axios";
import { logger } from "./logger";

export interface N8nJobPayload {
  job_id:    string;
  file_url:  string;
  ocr:       string;
  ai:        string;
}

/** Trigger the n8n OCR processing webhook */
export async function triggerN8nWebhook(payload: N8nJobPayload): Promise<void> {
  const url    = process.env.N8N_WEBHOOK_URL ?? "";
  const secret = process.env.N8N_SECRET     ?? "";

  if (!url) throw new Error("N8N_WEBHOOK_URL is not configured");

  try {
    await axios.post(url, payload, {
      headers: {
        "Content-Type":  "application/json",
        "X-N8N-Secret":  secret,
      },
      timeout: 10_000,
    });
    logger.info("n8n webhook triggered", { job_id: payload.job_id });
  } catch (err) {
    const axErr = err as AxiosError;
    logger.error("n8n webhook failed", {
      job_id: payload.job_id,
      status: axErr.response?.status,
      message: axErr.message,
    });
    throw new Error(`n8n trigger failed: ${axErr.message}`);
  }
}