// functions/status/index.ts — GET /status/:job_id

import express, { type Request, type Response } from "express";
import { getJobStatus }       from "../utils/redisClient";
import { getJobStatusFromDB } from "../utils/postgresClient";
import { logger } from "../utils/logger";

const router = express.Router();

router.get("/:job_id", async (req: Request, res: Response): Promise<void> => {
  const { job_id } = req.params;

  if (!job_id) {
    res.status(400).json({ error: "job_id is required" });
    return;
  }

  try {
    // 1. Try Redis first (fast cache)
    let status = await getJobStatus(job_id);

    // 2. Fallback to PostgreSQL if Redis miss
    if (!status) {
      status = await getJobStatusFromDB(job_id);
    }

    if (!status) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    logger.info("Status fetched", { job_id, status });

    // Contract: { job_id, status }
    res.status(200).json({ job_id, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status fetch failed";
    logger.error("Status handler error", { job_id, message });
    res.status(500).json({ error: "Status fetch failed" });
  }
});

export default router;