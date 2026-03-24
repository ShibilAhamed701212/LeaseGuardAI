// index.ts — OCR Server with full cloud-native health check
import express from "express";
import cors from "cors";
import { logger } from "./utils/logger";
import { 
  checkDatabaseHealth, 
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

const app = express();
const port = process.env.PORT || 10000;

// ── Basic Middleware ──────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ── Diagnostics & Health ────────────────────────────────────

app.get("/health", async (_req, res) => {
  // Use Promise.all to check all three services in parallel
  const [dbStatus, redisStatus, storageStatus] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
    checkStorageHealth()
  ]);

  const isOk = dbStatus === true && redisStatus === true && storageStatus === true;

  // Always return 200 so the frontend can read the diagnostic JSON body
  res.status(200).json({
    status: isOk ? "ok" : "degraded",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus === true ? "connected" : dbStatus,
      redis: redisStatus === true ? "connected" : redisStatus,
      storage: storageStatus === true ? "connected" : storageStatus
    }
  });
});

// ── Initialization Logic ──────────────────────────────────────

async function startServer() {
  logger.info("Initializing with config:", {
    PG_HOST: process.env.PG_HOST,
    PG_USER: process.env.PG_USER,
    PG_SSL: process.env.PG_SSL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_TLS: process.env.REDIS_TLS,
    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
    MINIO_BUCKET: process.env.MINIO_BUCKET,
    MINIO_USE_SSL: process.env.MINIO_USE_SSL,
  });

  try {
    logger.info("Backend initializing", { attempt: 1, maxRetries: 3 });

    // 1. Database
    await migrate();

    // 2. Storage
    await ensureBucket();

    // 3. Start Listening
    app.listen(port, () => {
      logger.info(`Server listening on port ${port}`);
      logger.info("Backend initialized successfully");
    });

  } catch (err: any) {
    logger.error("Startup init failed", { error: err.message });
    // In production, we don't necessarily want to exit(1) immediately on first failure 
    // to allow Render's health checks to provide diagnostic output.
    app.listen(port, () => {
      logger.warn("Server started in DEGRADED mode for diagnostics", { port });
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