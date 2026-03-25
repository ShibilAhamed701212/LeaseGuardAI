// functions/debug.ts — GET /debug
import express, { type Request, type Response } from "express";
import { getClient } from "./utils/redisClient";
import { getPool } from "./utils/postgresClient";
import { logger } from "./utils/logger";

const router = express.Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const redis = getClient();
    const pool  = getPool();

    // 1. Redis Stats
    const queueLen = await redis.llen("ocr:queue").catch(() => -1);
    const workerRunning = (await redis.get("ocr:worker:heartbeat")) !== null;

    // 2. DB Stats
    const dbStats = await pool.query(`
      SELECT status, COUNT(*) as count 
        FROM jobs 
       GROUP BY status
    `).then(r => r.rows).catch(() => []);

    // 3. Env Overview (masked)
    const env = {
      isProduction: process.env.NODE_ENV === "production",
      hasGemini: !!process.env.GEMINI_API_KEY,
      hasRedis:  !!(process.env.REDIS_URL || process.env.REDIS_HOST),
      hasN8n:    !!process.env.N8N_WEBHOOK_URL
    };

    res.status(200).json({
      status: "online",
      diagnostics: {
        queue: { length: queueLen, healthy: queueLen >= 0 },
        worker: { isActive: workerRunning },
        database: { stats: dbStats },
        environment: env
      },
      server: {
        uptime: process.uptime(),
        time: new Date().toISOString()
      }
    });
  } catch (err: any) {
    logger.error("Debug stats failed", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

export default router;
