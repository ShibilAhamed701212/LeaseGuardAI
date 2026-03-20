// functions/cleanup/index.ts — DELETE /cleanup/:job_id

import express, { type Request, type Response } from "express";
import { deleteFile }              from "../utils/minioClient";
import { deleteJobKeys }           from "../utils/redisClient";
import { getJob, updateJobStatus } from "../utils/postgresClient";
import { logger } from "../utils/logger";

const router = express.Router();

router.delete("/:job_id", async (req: Request, res: Response): Promise<void> => {
  const { job_id } = req.params;

  if (!job_id) {
    res.status(400).json({ error: "job_id is required" });
    return;
  }

  try {
    // 1. Validate job exists
    const job = await getJob(job_id);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const warnings: string[] = [];

    // 2. Delete file from MinIO (try all common extensions)
    const extensions = ["pdf", "jpg", "jpeg", "png", "webp"];
    let deleted = false;
    for (const ext of extensions) {
      try {
        await deleteFile(`uploads/${job_id}/file.${ext}`);
        deleted = true;
        break;
      } catch {
        // try next extension
      }
    }
    if (!deleted) {
      warnings.push("MinIO file not found (may already be deleted)");
      logger.warn("MinIO file not found during cleanup", { job_id });
    }

    // 3. Remove all Redis keys for this job
    await deleteJobKeys(job_id).catch((err: Error) => {
      warnings.push(`Redis cleanup partial: ${err.message}`);
      logger.warn("Redis cleanup error", { job_id, message: err.message });
    });

    // 4. Update PostgreSQL status to "deleted"
    await updateJobStatus(job_id, "deleted");

    logger.info("Cleanup complete", { job_id });

    // Contract: { job_id, status: "deleted" }
    res.status(200).json({
      job_id,
      status:   "deleted",
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cleanup failed";
    logger.error("Cleanup handler error", { job_id, message });
    res.status(500).json({ error: "Cleanup failed" });
  }
});

export default router;