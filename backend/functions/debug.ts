// functions/debug.ts — GET /debug — Enhanced debug with bug detection
import express, { type Request, type Response } from "express";
import { getClient } from "./utils/redisClient";
import { getPool } from "./utils/postgresClient";
import { logger, getDebugLogs, getBugPredictions, getSystemHealth } from "./utils/logger";
import { getErrorTracking, runDiagnostic } from "./utils/errorHandler";

const router = express.Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const redis = getClient();
    const pool  = getPool();

    const queueLen = await redis.llen("ocr:queue").catch(() => -1);
    const workerRunning = (await redis.get("ocr:worker:heartbeat")) !== null;
    const lastError = await redis.get("ocr:worker:last_error");

    const dbStats = await pool.query(`
      SELECT status, COUNT(*) as count 
        FROM jobs 
       GROUP BY status
    `).then(r => r.rows).catch(() => []);

    const env = {
      isProduction: process.env.NODE_ENV === "production",
      hasGemini: !!process.env.GEMINI_API_KEY,
      hasRedis:  !!(process.env.REDIS_URL || process.env.REDIS_HOST),
      hasN8n:    !!process.env.N8N_WEBHOOK_URL
    };

    const systemHealth = getSystemHealth();
    const bugPredictions = getBugPredictions();
    const errorTracking = getErrorTracking();

    res.status(200).json({
      status: "online",
      diagnostics: {
        queue: { length: queueLen, healthy: queueLen >= 0 },
        worker: { isActive: workerRunning, lastError },
        database: { stats: dbStats },
        environment: env,
        systemHealth: {
          errorRate: systemHealth.errorRate.toFixed(2) + "%",
          memoryUsage: systemHealth.memoryUsage + "MB",
          uptime: Math.round(systemHealth.uptime) + "s",
          recentErrors: systemHealth.recentErrors
        },
        bugPredictions: bugPredictions.map(b => ({
          issue: b.issue,
          severity: b.severity,
          recommendation: b.recommendation,
          occurrenceCount: b.occurrenceCount
        })),
        errorTracking
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

router.get("/logs", async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const level = req.query.level as string;
    
    let logs = getDebugLogs(hours);
    
    if (level) {
      logs = logs.filter(l => l.level === level);
    }
    
    res.json({
      count: logs.length,
      logs: logs.slice(-100)
    });
  } catch (err: any) {
    logger.error("Debug logs failed", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.get("/health", async (_req: Request, res: Response) => {
  try {
    const result = await runDiagnostic();
    const httpStatus = result.status === "healthy" ? 200 : result.status === "degraded" ? 200 : 503;
    res.status(httpStatus).json(result);
  } catch (err: any) {
    logger.error("Health check failed", { error: err.message });
    res.status(500).json({ status: "error", error: err.message });
  }
});

router.get("/predictions", (_req: Request, res: Response) => {
  const predictions = getBugPredictions();
  res.json({ count: predictions.length, predictions });
});

router.get("/errors", (_req: Request, res: Response) => {
  const tracking = getErrorTracking();
  res.json({ count: tracking.length, errors: tracking });
});

export default router;
