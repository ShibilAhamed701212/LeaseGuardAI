"use strict";
// utils/n8nClient.ts — n8n webhook trigger service
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerN8nWebhook = triggerN8nWebhook;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("./logger");
/** Trigger the n8n OCR processing webhook */
async function triggerN8nWebhook(payload) {
    const url = process.env.N8N_WEBHOOK_URL ?? "";
    const secret = process.env.N8N_SECRET ?? "";
    if (!url)
        throw new Error("N8N_WEBHOOK_URL is not configured");
    try {
        await axios_1.default.post(url, payload, {
            headers: {
                "Content-Type": "application/json",
                "X-N8N-Secret": secret,
            },
            timeout: 10000,
        });
        logger_1.logger.info("n8n webhook triggered", { job_id: payload.job_id });
    }
    catch (err) {
        const axErr = err;
        logger_1.logger.error("n8n webhook failed", {
            job_id: payload.job_id,
            status: axErr.response?.status,
            message: axErr.message,
        });
        throw new Error(`n8n trigger failed: ${axErr.message}`);
    }
}
//# sourceMappingURL=n8nClient.js.map