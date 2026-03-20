// functions/index.ts — Firebase Functions entry point

import * as functions from "firebase-functions";
import express from "express";
import cors from "cors";
import uploadRouter  from "./upload";
import processRouter from "./process";
import statusRouter  from "./status";
import resultRouter  from "./result";
import cleanupRouter from "./cleanup";
import { migrate }   from "./utils/postgresClient";
import { ensureBucket } from "./utils/minioClient";
import { logger } from "./utils/logger";

const app = express();

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
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── 404 handler ────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Global error handler ───────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("Unhandled error", { message: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal server error" });
});

// ── Startup: run migrations + ensure MinIO bucket ─────────────
async function init(): Promise<void> {
  try {
    await migrate();
    await ensureBucket();
    logger.info("Backend initialized successfully");
  } catch (err) {
    logger.error("Startup init failed", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

init();

// ── Export as Firebase Function ────────────────────────────────
export const api = functions
  .runWith({ memory: "512MB", timeoutSeconds: 120 })
  .https.onRequest(app);