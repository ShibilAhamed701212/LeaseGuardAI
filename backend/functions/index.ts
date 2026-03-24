// index.ts — OCR Server with Super-Diagnostics + Full API functionality
import express from "express";
import cors from "cors";
import { logger } from "./utils/logger";
import { 
  checkDBHealth as checkDatabaseHealth, 
  migrate, 
  getPool 
} from "./utils/postgresClient";
import { 
  checkRedisHealth, 
  closeRedis 
} from "./utils/redisClient";
import { 
  checkStorageHealth, 
  ensureBucket 
} from "./utils/minioClient";

// ── Route Handlers ────────────────────────────────────────────

import uploadHandler from "./upload";
import statusHandler from "./status";
import processHandler from "./process";
import resultHandler from "./result";
import cleanupHandler from "./cleanup";

const app = express();
const port = process.env.PORT || 10000;

// ── Basic Middleware ──────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ── Super-Diagnostic Health Check ───────────────────────────

app.get("/health", async (_req, res) => {
  try {
    const [dbResult, redisResult, storageResult] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
      checkStorageHealth()
    ]);

    const isOk = dbResult === true && redisResult === true && storageResult === true;
    const maskEnd = (val: string | undefined) => val ? `${val.substring(0, 15)}...` : "missing";

    res.status(200).json({
      status: isOk ? "ok" : "degraded",
      server: {
        uptime: process.uptime(),
        time: new Date().toISOString(),
        platform: process.platform,
        node: process.version
      },
      services: {
        database: {
          status: dbResult === true ? "connected" : "failed",
          error: dbResult === true ? null : dbResult,
          config: { host: maskEnd(process.env.PG_HOST), user: process.env.PG_USER }
        },
        redis: {
          status: redisResult === true ? "connected" : "failed",
          error: redisResult === true ? null : redisResult,
          config: { 
            source: process.env.REDIS_URL ? "REDIS_URL" : "HOST/PORT",
            host: process.env.REDIS_URL ? maskEnd(process.env.REDIS_URL) : maskEnd(process.env.REDIS_HOST)
          }
        },
        storage: {
          status: storageResult === true ? "connected" : "failed",
          error: storageResult === true ? null : storageResult,
          config: { 
            endpoint: maskEnd(process.env.MINIO_ENDPOINT),
            bucket: process.env.MINIO_BUCKET,
            ssl: process.env.MINIO_USE_SSL
          }
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

// ── Actual API Routes ──────────────────────────────────────────

app.use("/upload", uploadHandler);
app.use("/status", statusHandler);
app.use("/process", processHandler);
app.use("/result", resultHandler);
app.use("/cleanup", cleanupHandler);

// ── Initialization Logic ──────────────────────────────────────

async function startServer() {
  try {
    logger.info("Initializing OCR Cloud Stack...");
    
    // 1. Database
    await migrate();

    // 2. Storage
    await ensureBucket();

    // 3. Start Listening
    app.listen(port, () => {
      logger.info(`Server listening on port ${port}`);
    });

  } catch (err: any) {
    logger.error("Startup partial failure", { error: err.message });
    app.listen(port, () => {
      logger.warn("Server started in diagnostic mode", { port });
    });
  }
}

// ── Shutdown Logic ────────────────────────────────────────────

process.on("SIGTERM", async () => {
  logger.info("Shutting down gracefully...");
  await closeRedis();
  const pool = getPool();
  if (pool) await pool.end();
  process.exit(0);
});

// Run!
startServer();