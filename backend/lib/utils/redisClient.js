"use strict";
// utils/redisClient.ts — Redis queue + cache service
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushJob = pushJob;
exports.storeResult = storeResult;
exports.getResult = getResult;
exports.deleteJobKeys = deleteJobKeys;
exports.setJobStatus = setJobStatus;
exports.getJobStatus = getJobStatus;
exports.closeRedis = closeRedis;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("./logger");
const RESULT_TTL = parseInt(process.env.REDIS_RESULT_TTL_SECONDS ?? "86400", 10);
// ── Singleton client with explicit connect ────────────────────
let _client = null;
function getClient() {
    if (_client)
        return _client;
    _client = new ioredis_1.default({
        host: process.env.REDIS_HOST ?? "localhost",
        port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            // Exponential backoff: 200ms, 400ms, 800ms … capped at 5s
            const delay = Math.min(times * 200, 5000);
            logger_1.logger.warn("Redis reconnecting", { attempt: times, delayMs: delay });
            return delay;
        },
        reconnectOnError(err) {
            // Only reconnect on connection-level errors, not command errors
            const target = err.message;
            return target.includes("READONLY") || target.includes("ECONNRESET");
        },
        lazyConnect: false, // connect immediately
    });
    _client.on("error", (err) => {
        logger_1.logger.error("Redis client error", { message: err.message });
    });
    _client.on("connect", () => {
        logger_1.logger.info("Redis connected");
    });
    return _client;
}
// ── Queue Operations ──────────────────────────────────────────
/** Push a job payload onto the processing queue */
async function pushJob(job_id, payload) {
    const redis = getClient();
    await redis.rpush("ocr:queue", JSON.stringify({ job_id, ...payload }));
    logger_1.logger.info("Job pushed to Redis queue", { job_id });
}
// ── Result Cache ──────────────────────────────────────────────
/** Store a job result temporarily */
async function storeResult(job_id, result) {
    const redis = getClient();
    const key = `ocr:result:${job_id}`;
    await redis.set(key, JSON.stringify(result), "EX", RESULT_TTL);
    logger_1.logger.info("Result stored in Redis", { job_id, ttl: RESULT_TTL });
}
/** Retrieve a job result */
async function getResult(job_id) {
    const redis = getClient();
    const raw = await redis.get(`ocr:result:${job_id}`);
    if (!raw)
        return null;
    return JSON.parse(raw);
}
// ── Key Management ────────────────────────────────────────────
/** Delete all Redis keys for a job (uses SCAN instead of KEYS for safety) */
async function deleteJobKeys(job_id) {
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
        logger_1.logger.info("Redis keys deleted", { job_id, count: totalDeleted });
    }
}
// ── Status Cache ──────────────────────────────────────────────
/** Store job status in Redis (fast reads for polling) */
async function setJobStatus(job_id, status) {
    const redis = getClient();
    await redis.set(`ocr:status:${job_id}`, status, "EX", RESULT_TTL);
}
/** Get job status from Redis */
async function getJobStatus(job_id) {
    const redis = getClient();
    return redis.get(`ocr:status:${job_id}`);
}
// ── Graceful Shutdown ─────────────────────────────────────────
async function closeRedis() {
    if (_client) {
        await _client.quit();
        _client = null;
        logger_1.logger.info("Redis connection closed");
    }
}
//# sourceMappingURL=redisClient.js.map