// utils/redisClient.ts — Redis queue + cache service

import Redis from "ioredis";
import { logger } from "./logger";

const RESULT_TTL = parseInt(process.env.REDIS_RESULT_TTL_SECONDS ?? "86400", 10);

// ── Singleton client with explicit connect ────────────────────

let _client: Redis | null = null;

function getClient(): Redis {
  if (_client) return _client;

  _client = new Redis({
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    username: "default", // Required for many cloud providers like Upstash
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === "true" ? {} : undefined,
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      // Exponential backoff: 200ms, 400ms, 800ms … capped at 5s
      const delay = Math.min(times * 200, 5_000);
      logger.warn("Redis reconnecting", { attempt: times, delayMs: delay });
      return delay;
    },
    reconnectOnError(err: Error) {
      // Only reconnect on connection-level errors, not command errors
      const target = err.message;
      return target.includes("READONLY") || target.includes("ECONNRESET");
    },
    lazyConnect: false, // connect immediately
  });

  _client.on("error", (err) => {
    logger.error("Redis client error", { message: err.message });
  });

  _client.on("connect", () => {
    logger.info("Redis connected");
  });

  return _client;
}

// ── Queue Operations ──────────────────────────────────────────

/** Push a job payload onto the processing queue */
export async function pushJob(job_id: string, payload: Record<string, unknown>): Promise<void> {
  const redis = getClient();
  await redis.rpush("ocr:queue", JSON.stringify({ job_id, ...payload }));
  logger.info("Job pushed to Redis queue", { job_id });
}

// ── Result Cache ──────────────────────────────────────────────

/** Store a job result temporarily */
export async function storeResult(job_id: string, result: Record<string, unknown>): Promise<void> {
  const redis = getClient();
  const key = `ocr:result:${job_id}`;
  await redis.set(key, JSON.stringify(result), "EX", RESULT_TTL);
  logger.info("Result stored in Redis", { job_id, ttl: RESULT_TTL });
}

/** Retrieve a job result */
export async function getResult(job_id: string): Promise<Record<string, unknown> | null> {
  const redis = getClient();
  const raw = await redis.get(`ocr:result:${job_id}`);
  if (!raw) return null;
  return JSON.parse(raw) as Record<string, unknown>;
}

// ── Key Management ────────────────────────────────────────────

/** Delete all Redis keys for a job (uses SCAN instead of KEYS for safety) */
export async function deleteJobKeys(job_id: string): Promise<void> {
  const redis = getClient();
  const pattern = `ocr:*:${job_id}`;
  let cursor = "0";
  let totalDeleted = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
      totalDeleted += keys.length;
    }
  } while (cursor !== "0");

  if (totalDeleted > 0) {
    logger.info("Redis keys deleted", { job_id, count: totalDeleted });
  }
}

// ── Status Cache ──────────────────────────────────────────────

/** Store job status in Redis (fast reads for polling) */
export async function setJobStatus(job_id: string, status: string): Promise<void> {
  const redis = getClient();
  await redis.set(`ocr:status:${job_id}`, status, "EX", RESULT_TTL);
}

/** Get job status from Redis */
export async function getJobStatus(job_id: string): Promise<string | null> {
  const redis = getClient();
  return redis.get(`ocr:status:${job_id}`);
}

// ── Graceful Shutdown ─────────────────────────────────────────

export async function closeRedis(): Promise<void> {
  if (_client) {
    await _client.quit();
    _client = null;
    logger.info("Redis connection closed");
  }
}

/** Check Redis health */
export async function checkRedisHealth(): Promise<string | true> {
  try {
    const redis = getClient();
    await redis.ping();
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Redis health check failed", { error: msg });
    return msg;
  }
}