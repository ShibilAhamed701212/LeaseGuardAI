"use strict";
// functions/process/index.ts — POST /process
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const postgresClient_1 = require("../utils/postgresClient");
const redisClient_1 = require("../utils/redisClient");
const minioClient_1 = require("../utils/minioClient");
const n8nClient_1 = require("../utils/n8nClient");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
const VALID_OCR = ["tesseract", "paddle"];
const VALID_AI = ["ollama", "openai", "claude"];
router.post("/", async (req, res) => {
    const { job_id, ocr, ai } = req.body;
    // Validate all required fields and enums
    if (!job_id || !ocr || !ai) {
        res.status(400).json({ error: "Invalid job_id or parameters" });
        return;
    }
    if (!VALID_OCR.includes(ocr)) {
        res.status(400).json({ error: "Invalid job_id or parameters" });
        return;
    }
    if (!VALID_AI.includes(ai)) {
        res.status(400).json({ error: "Invalid job_id or parameters" });
        return;
    }
    try {
        // 1. Validate job exists
        const job = await (0, postgresClient_1.getJob)(job_id);
        if (!job) {
            res.status(404).json({ error: "Invalid job_id or parameters" });
            return;
        }
        if (job.status === "processing") {
            res.status(409).json({ error: "Invalid job_id or parameters" });
            return;
        }
        // 2. Generate signed MinIO URL for n8n
        const ext = "pdf";
        const objectName = `uploads/${job_id}/file.${ext}`;
        const file_url = await (0, minioClient_1.getSignedUrl)(objectName);
        // 3. Update PostgreSQL status
        await (0, postgresClient_1.updateJobStatus)(job_id, "processing", ocr, ai);
        // 4. Update Redis status cache
        await (0, redisClient_1.setJobStatus)(job_id, "processing");
        // 5. Push to Redis queue
        await (0, redisClient_1.pushJob)(job_id, { ocr, ai, file_url });
        // 6. Trigger n8n webhook
        await (0, n8nClient_1.triggerN8nWebhook)({ job_id, file_url, ocr, ai });
        logger_1.logger.info("Processing triggered", { job_id, ocr, ai });
        // Contract: { job_id, status: "processing" }
        res.status(200).json({ job_id, status: "processing" });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Process trigger failed";
        logger_1.logger.error("Process handler error", { job_id, message });
        await (0, postgresClient_1.updateJobStatus)(job_id, "failed").catch(() => null);
        await (0, redisClient_1.setJobStatus)(job_id, "failed").catch(() => null);
        res.status(500).json({ error: "Invalid job_id or parameters" });
    }
});
exports.default = router;
//# sourceMappingURL=index.js.map