"use strict";
// functions/result/index.ts — GET /result/:job_id
// Result fetched from Redis only (never stored in DB — privacy rule)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const redisClient_1 = require("../utils/redisClient");
const postgresClient_1 = require("../utils/postgresClient");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
router.get("/:job_id", async (req, res) => {
    const { job_id } = req.params;
    if (!job_id) {
        res.status(400).json({ error: "Result not available" });
        return;
    }
    try {
        // 1. Validate job exists in PostgreSQL
        const job = await (0, postgresClient_1.getJob)(job_id);
        if (!job) {
            res.status(404).json({ error: "Result not available" });
            return;
        }
        if (job.status === "processing" || job.status === "uploaded") {
            res.status(202).json({ error: "Result not available", status: job.status });
            return;
        }
        if (job.status === "failed") {
            res.status(422).json({ error: "Result not available" });
            return;
        }
        if (job.status === "deleted") {
            res.status(410).json({ error: "Result not available" });
            return;
        }
        // 2. Fetch result from Redis (set by n8n callback)
        const stored = await (0, redisClient_1.getResult)(job_id);
        if (!stored) {
            res.status(404).json({ error: "Result not available" });
            return;
        }
        logger_1.logger.info("Result fetched", { job_id });
        // Contract: { job_id, status: "completed", data: { sla, vin, price_estimate, fairness_score, negotiation_tips } }
        res.status(200).json({
            job_id,
            status: "completed",
            data: stored,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Result fetch failed";
        logger_1.logger.error("Result handler error", { job_id, message });
        res.status(500).json({ error: "Result not available" });
    }
});
exports.default = router;
//# sourceMappingURL=index.js.map