// index.ts — Standalone Express server for Render deployment
import express from "express";
import cors from "cors";
import uploadRouter from "./upload";
import processRouter from "./process";
import statusRouter from "./status";
import resultRouter from "./result";
import cleanupRouter from "./cleanup";
import { migrate, closePool, getPool } from "./utils/postgresClient";
import { checkStorageHealth } from "./utils/minioClient";
import { checkRedisHealth } from "./utils/redisClient";
import { logger } from "./utils/logger";

const app = express();
const PORT = parseInt(process.env.PORT ?? "5001", 10);

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({ origin: true }));

// ── Routes ─────────────────────────────────────────────────────
// NOTE: /upload MUST come before express.json() to prevent stream consumption issues
app.use("/upload", uploadRouter);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/process", processRouter);
app.use("/status", statusRouter);
app.use("/result", resultRouter);
app.use("/cleanup", cleanupRouter);

// ── Enhanced Health Check ──────────────────────────────────────
app.get("/health", async (req, res) => {
  const [dbStatus, redisStatus, storageStatus] = await Promise.all([
    (async () => {
      try {
        const p = getPool();
        await p.query("SELECT 1");
        return { ok: true };
      } catch (e: any) {
        return { ok: false, err: e.message };
      }
    })(),
    (async () => {
      try {
        const ok = await checkRedisHealth();
        return ok ? { ok: true } : { ok: false, err: "Ping failed" };
      } catch (e: any) {
        return { ok: false, err: e.message };
      }
    })(),
    (async () => {
      try {
        const ok = await checkStorageHealth();
        return ok ? { ok: true } : { ok: false, err: "Bucket check failed" };
      } catch (e: any) {
        return { ok: false, err: e.message };
      }
    })()
  ]);

  const allOk = dbStatus.ok && redisStatus.ok && storageStatus.ok;

  res.status(200).json({
    status: allOk ? "ok" : "degraded",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus.ok ? "connected" : dbStatus.err,
      redis: redisStatus.ok ? "connected" : redisStatus.err,
      storage: storageStatus.ok ? "connected" : storageStatus.err
    }
  });
});

// ── Initialization Logic ──────────────────────────────────────
const MAX_INIT_RETRIES = 3;
const INIT_RETRY_DELAY_MS = 2000;

async function init(): Promise<void> {
  for (let attempt = 1; attempt <= MAX_INIT_RETRIES; attempt++) {
    try {
      logger.info("Backend initializing", { attempt, maxRetries: MAX_INIT_RETRIES });
      await migrate();
      logger.info("Backend initialized successfully");
      return;
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Startup init failed", { attempt, message, stack: err.stack });

      if (attempt < MAX_INIT_RETRIES) {
        logger.info("Retrying init", { nextAttemptIn: `${INIT_RETRY_DELAY_MS}ms` });
        await new Promise(resolve => setTimeout(resolve, INIT_RETRY_DELAY_MS));
      }
    }
  }
  logger.error("All init retries exhausted — backend starting in degraded mode");
}

// ── Bootstrap ─────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Server listening on port ${PORT}`);
  init();
});

// ── Graceful Shutdown ─────────────────────────────────────────
async function shutdown() {
  logger.info("Shutting down...");
  await closePool();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);