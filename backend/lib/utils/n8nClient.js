"use strict";
// utils/n8nClient.ts — n8n webhook trigger service with retry
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerN8nWebhook = triggerN8nWebhook;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("./logger");
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/** Trigger the n8n OCR processing webhook (with retry) */
async function triggerN8nWebhook(payload) {
    const url = process.env.N8N_WEBHOOK_URL ?? "";
    const secret = process.env.N8N_SECRET ?? "";
    if (!url)
        throw new Error("N8N_WEBHOOK_URL is not configured");
    let lastError = null;
    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
        try {
            await axios_1.default.post(url, payload, {
                headers: {
                    "Content-Type": "application/json",
                    "X-N8N-Secret": secret,
                },
                timeout: 10000,
            });
            logger_1.logger.info("n8n webhook triggered", { job_id: payload.job_id, attempt });
            return;
        }
        catch (err) {
            const axErr = err;
            lastError = axErr;
            const status = axErr.response?.status;
            logger_1.logger.warn("n8n webhook attempt failed", {
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
    const axErr = lastError;
    logger_1.logger.error("n8n webhook failed after retries", {
        job_id: payload.job_id,
        status: axErr?.response?.status,
        message: axErr?.message,
    });
    throw new Error(`n8n trigger failed: ${axErr?.message ?? "Unknown error"}`);
}
//# sourceMappingURL=n8nClient.js.map