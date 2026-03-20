// utils/redisClient.ts — Redis queue + cache service

import Redis from "ioredis";
import { logger } from "./logger";

const RESULT_TTL = parseInt(process.env.REDIS_RESULT_TTL_SECONDS ?? "86400", 10);

let _client: Redis | null = null;

function getClient(): Redis {
  if (_client) return _client;
  _client = new Redis({
    host:        process.env.REDIS_HOST     ?? "localhost",
    port:        parseInt(process.env.REDIS_PORT ?? "6379", 10),
    password:    process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    lazyConnect:  true,
  });
  _client.on("error", (err) => logger.error("Redis error", { message: err.message }));
  return _client;
}

/** Push a job payload onto the processing queue */
export async function pushJob(job_id: string, payload: Record<string, unknown>): Promise<void> {
  const redis = getClient();
  await redis.rpush("ocr:queue", JSON.stringify({ job_id, ...payload }));
  logger.info("Job pushed to Redis queue", { job_id });
}

/** Store a job result temporarily */
export async function storeResult(job_id: string, result: Record<string, unknown>): Promise<void> {
  const redis = getClient();
  const key   = `ocr:result:${job_id}`;
  await redis.set(key, JSON.stringify(result), "EX", RESULT_TTL);
  logger.info("Result stored in Redis", { job_id, ttl: RESULT_TTL });
}

/** Retrieve a job result */
export async function getResult(job_id: string): Promise<Record<string, unknown> | null> {
  const redis = getClient();
  const raw   = await redis.get(`ocr:result:${job_id}`);
  if (!raw) return null;
  return JSON.parse(raw) as Record<string, unknown>;
}

/** Delete all Redis keys for a job */
export async function deleteJobKeys(job_id: string): Promise<void> {
  const redis  = getClient();
  const keys   = await redis.keys(`ocr:*:${job_id}`);
  if (keys.length > 0) {
    await redis.del(...keys);
    logger.info("Redis keys deleted", { job_id, count: keys.length });
  }
}

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