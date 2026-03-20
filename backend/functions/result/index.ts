// functions/result/index.ts — GET /result/:job_id
// Result fetched from Redis only (never stored in DB — privacy rule)

import express, { type Request, type Response } from "express";
import { getResult }  from "../utils/redisClient";
import { getJob }     from "../utils/postgresClient";
import { logger } from "../utils/logger";

const router = express.Router();

router.get("/:job_id", async (req: Request, res: Response): Promise<void> => {
  const { job_id } = req.params;

  if (!job_id) {
    res.status(400).json({ error: "Result not available" });
    return;
  }

  try {
    // 1. Validate job exists in PostgreSQL
    const job = await getJob(job_id);
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
    const stored = await getResult(job_id);
    if (!stored) {
      res.status(404).json({ error: "Result not available" });
      return;
    }

    logger.info("Result fetched", { job_id });

    // Contract: { job_id, status: "completed", data: { sla, vin, price_estimate, fairness_score, negotiation_tips } }
    res.status(200).json({
      job_id,
      status: "completed",
      data:   stored,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Result fetch failed";
    logger.error("Result handler error", { job_id, message });
    res.status(500).json({ error: "Result not available" });
  }
});

export default router;