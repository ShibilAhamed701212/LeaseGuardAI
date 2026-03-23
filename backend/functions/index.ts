// functions/index.ts — Standalone Express server entry point
// Works on any Node.js host: Render, Railway, fly.io, local, etc.

import express from "express";
import cors from "cors";
import uploadRouter  from "./upload";
import processRouter from "./process";
import statusRouter  from "./status";
import resultRouter  from "./result";
import cleanupRouter from "./cleanup";
import { migrate, closePool }   from "./utils/postgresClient";
import { ensureBucket }         from "./utils/minioClient";
import { closeRedis }           from "./utils/redisClient";
import { logger }               from "./utils/logger";

const app = express();
const PORT = parseInt(process.env.PORT ?? "5001", 10);

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────────────────
app.use("/upload",   uploadRouter);
app.use("/process",  processRouter);
app.use("/status",   statusRouter);
app.use("/result",   resultRouter);
app.use("/cleanup",  cleanupRouter);

// ── Health check ───────────────────────────────────────────────
let _initialized = false;

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: _initialized ? "ok" : "initializing",
    timestamp: new Date().toISOString(),
  });
});

// ── Root ───────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.status(200).json({
    service: "OCR Agent API",
    version: "1.0.0",
    status: _initialized ? "ready" : "initializing",
  });
});

// ── 404 handler ────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Global error handler ───────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("Unhandled error", { message: err.message, stack: err.stack });
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Startup ────────────────────────────────────────────────────

const MAX_INIT_RETRIES = 3;
const INIT_RETRY_DELAY_MS = 2_000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function init(): Promise<void> {
  for (let attempt = 1; attempt <= MAX_INIT_RETRIES; attempt++) {
    try {
      logger.info("Backend initializing", { attempt, maxRetries: MAX_INIT_RETRIES });
      await migrate();
      await ensureBucket();
      _initialized = true;
      logger.info("Backend initialized successfully");
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Startup init failed", { attempt, message });

      if (attempt < MAX_INIT_RETRIES) {
        logger.info("Retrying init", { nextAttemptIn: `${INIT_RETRY_DELAY_MS}ms` });
        await sleep(INIT_RETRY_DELAY_MS);
      } else {
        logger.error("All init retries exhausted — backend starting in degraded mode");
      }
    }
  }
}

// ── Start the HTTP server ──────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Server listening on port ${PORT}`);
  init();
});

// ── Graceful shutdown ──────────────────────────────────────────
async function shutdown(): Promise<void> {
  logger.info("Shutting down gracefully…");
  await closePool();
  await closeRedis();
  logger.info("Shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);