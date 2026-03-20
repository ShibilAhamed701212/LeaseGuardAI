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
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("./logger");
const RESULT_TTL = parseInt(process.env.REDIS_RESULT_TTL_SECONDS ?? "86400", 10);
let _client = null;
function getClient() {
    if (_client)
        return _client;
    _client = new ioredis_1.default({
        host: process.env.REDIS_HOST ?? "localhost",
        port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    });
    _client.on("error", (err) => logger_1.logger.error("Redis error", { message: err.message }));
    return _client;
}
/** Push a job payload onto the processing queue */
async function pushJob(job_id, payload) {
    const redis = getClient();
    await redis.rpush("ocr:queue", JSON.stringify({ job_id, ...payload }));
    logger_1.logger.info("Job pushed to Redis queue", { job_id });
}
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
/** Delete all Redis keys for a job */
async function deleteJobKeys(job_id) {
    const redis = getClient();
    const keys = await redis.keys(`ocr:*:${job_id}`);
    if (keys.length > 0) {
        await redis.del(...keys);
        logger_1.logger.info("Redis keys deleted", { job_id, count: keys.length });
    }
}
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
//# sourceMappingURL=redisClient.js.map