"use strict";
// utils/postgresClient.ts — PostgreSQL metadata service (NO file content stored)
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrate = migrate;
exports.createJob = createJob;
exports.updateJobStatus = updateJobStatus;
exports.getJob = getJob;
exports.getJobStatusFromDB = getJobStatusFromDB;
exports.withTransaction = withTransaction;
const pg_1 = require("pg");
const logger_1 = require("./logger");
let _pool = null;
function getPool() {
    if (_pool)
        return _pool;
    if (!process.env.PG_USER || !process.env.PG_PASSWORD) {
        throw new Error("PG_USER and PG_PASSWORD environment variables are required.");
    }
    _pool = new pg_1.Pool({
        host: process.env.PG_HOST ?? "localhost",
        port: parseInt(process.env.PG_PORT ?? "5432", 10),
        database: process.env.PG_DATABASE ?? "ocr_agent",
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    });
    _pool.on("error", (err) => logger_1.logger.error("PG pool error", { message: err.message }));
    return _pool;
}
/** Run DB migrations — creates jobs table if not exists */
async function migrate() {
    const pool = getPool();
    await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      job_id      TEXT PRIMARY KEY,
      status      TEXT NOT NULL DEFAULT 'uploaded',
      ocr_engine  TEXT,
      ai_model    TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  `);
    logger_1.logger.info("DB migration complete");
}
/** Create a new job record */
async function createJob(job_id) {
    await getPool().query(`INSERT INTO jobs (job_id, status, created_at, updated_at)
     VALUES ($1, 'uploaded', NOW(), NOW())`, [job_id]);
    logger_1.logger.info("Job created in DB", { job_id });
}
/** Update job status + optional engine/model info */
async function updateJobStatus(job_id, status, ocr_engine, ai_model) {
    await getPool().query(`UPDATE jobs
     SET status     = $2,
         ocr_engine = COALESCE($3, ocr_engine),
         ai_model   = COALESCE($4, ai_model),
         updated_at = NOW()
     WHERE job_id   = $1`, [job_id, status, ocr_engine ?? null, ai_model ?? null]);
    logger_1.logger.info("Job status updated", { job_id, status });
}
/** Fetch a single job record */
async function getJob(job_id) {
    const res = await getPool().query(`SELECT job_id, status, ocr_engine, ai_model, created_at, updated_at
     FROM jobs WHERE job_id = $1`, [job_id]);
    return res.rows[0] ?? null;
}
/** Fetch only the status of a job (fast) */
async function getJobStatusFromDB(job_id) {
    const res = await getPool().query(`SELECT status FROM jobs WHERE job_id = $1`, [job_id]);
    return res.rows[0]?.status ?? null;
}
/** Wrap operations in a transaction */
async function withTransaction(fn) {
    const client = await getPool().connect();
    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    }
    catch (err) {
        await client.query("ROLLBACK");
        throw err;
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=postgresClient.js.map