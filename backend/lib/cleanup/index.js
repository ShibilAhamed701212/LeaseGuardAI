"use strict";
// functions/cleanup/index.ts — DELETE /cleanup/:job_id
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const minioClient_1 = require("../utils/minioClient");
const redisClient_1 = require("../utils/redisClient");
const postgresClient_1 = require("../utils/postgresClient");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
router.delete("/:job_id", async (req, res) => {
    const { job_id } = req.params;
    if (!job_id) {
        res.status(400).json({ error: "job_id is required" });
        return;
    }
    try {
        // 1. Validate job exists
        const job = await (0, postgresClient_1.getJob)(job_id);
        if (!job) {
            res.status(404).json({ error: "Job not found" });
            return;
        }
        const warnings = [];
        // 2. Delete file from MinIO (try all common extensions)
        const extensions = ["pdf", "jpg", "jpeg", "png", "webp"];
        let deleted = false;
        for (const ext of extensions) {
            try {
                await (0, minioClient_1.deleteFile)(`uploads/${job_id}/file.${ext}`);
                deleted = true;
                break;
            }
            catch {
                // try next extension
            }
        }
        if (!deleted) {
            warnings.push("MinIO file not found (may already be deleted)");
            logger_1.logger.warn("MinIO file not found during cleanup", { job_id });
        }
        // 3. Remove all Redis keys for this job
        await (0, redisClient_1.deleteJobKeys)(job_id).catch((err) => {
            warnings.push(`Redis cleanup partial: ${err.message}`);
            logger_1.logger.warn("Redis cleanup error", { job_id, message: err.message });
        });
        // 4. Update PostgreSQL status to "deleted"
        await (0, postgresClient_1.updateJobStatus)(job_id, "deleted");
        logger_1.logger.info("Cleanup complete", { job_id });
        // Contract: { job_id, status: "deleted" }
        res.status(200).json({
            job_id,
            status: "deleted",
            warnings: warnings.length > 0 ? warnings : undefined,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Cleanup failed";
        logger_1.logger.error("Cleanup handler error", { job_id, message });
        res.status(500).json({ error: "Cleanup failed" });
    }
});
exports.default = router;
//# sourceMappingURL=index.js.map