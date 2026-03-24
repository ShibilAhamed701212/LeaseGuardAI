// index.ts — Advanced OCR Server with Super-Diagnostic dashboard
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

// ── Super-Diagnostic Health Check ───────────────────────────

app.get("/health", async (_req, res) => {
  // Parallel check for performance
  const [dbStatus, redisStatus, storageStatus] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
    checkStorageHealth()
  ]);

  const isOk = dbStatus === true && redisStatus === true && storageStatus === true;

  // Mask sensitive values for the report
  const mask = (val: string | undefined) => val ? `${val.substring(0, 4)}...${val.substring(val.length - 4)}` : "missing";
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
        status: dbStatus === true ? "connected" : "failed",
        error: dbStatus === true ? null : dbStatus,
        config: { host: maskEnd(process.env.PG_HOST), user: process.env.PG_USER }
      },
      redis: {
        status: redisStatus === true ? "connected" : "failed",
        error: redisStatus === true ? null : redisStatus,
        config: { 
          source: process.env.REDIS_URL ? "REDIS_URL" : "HOST/PORT",
          host: process.env.REDIS_URL ? maskEnd(process.env.REDIS_URL) : maskEnd(process.env.REDIS_HOST)
        }
      },
      storage: {
        status: storageStatus === true ? "connected" : "failed",
        error: storageStatus === true ? null : storageStatus,
        config: { 
          endpoint: maskEnd(process.env.MINIO_ENDPOINT),
          bucket: process.env.MINIO_BUCKET,
          ssl: process.env.MINIO_USE_SSL
        }
      }
    }
  });
});

// ── Initialization ────────────────────────────────────────────

async function startServer() {
  try {
    logger.info("Initializing OCR Cloud Stack...");
    
    // 1. DB
    await migrate();

    // 2. Storage
    await ensureBucket();

    // 3. Listen
    app.listen(port, () => {
      logger.info(`Server listening on port ${port}`);
    });

  } catch (err: any) {
    logger.error("Startup partial failure", { error: err.message });
    // Keep server alive for /health diagnostics even if core init fails
    app.listen(port, () => {
      logger.warn("Server running in diagnostic mode due to init failure");
    });
  }
}

// ── Shutdown ────────────────────────────────────────────

process.on("SIGTERM", async () => {
  logger.info("Shutting down...");
  await closeRedis();
  const pool = getPool();
  if (pool) await pool.end();
  process.exit(0);
});

startServer();