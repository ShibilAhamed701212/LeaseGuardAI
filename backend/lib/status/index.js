"use strict";
// functions/status/index.ts — GET /status/:job_id
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
        res.status(400).json({ error: "job_id is required" });
        return;
    }
    try {
        // 1. Try Redis first (fast cache)
        let status = await (0, redisClient_1.getJobStatus)(job_id);
        // 2. Fallback to PostgreSQL if Redis miss
        if (!status) {
            status = await (0, postgresClient_1.getJobStatusFromDB)(job_id);
        }
        if (!status) {
            res.status(404).json({ error: "Job not found" });
            return;
        }
        logger_1.logger.info("Status fetched", { job_id, status });
        // Contract: { job_id, status }
        res.status(200).json({ job_id, status });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Status fetch failed";
        logger_1.logger.error("Status handler error", { job_id, message });
        res.status(500).json({ error: "Status fetch failed" });
    }
});
exports.default = router;
//# sourceMappingURL=index.js.map