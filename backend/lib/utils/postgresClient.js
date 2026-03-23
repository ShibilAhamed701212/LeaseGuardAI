"use strict";
// utils/postgresClient.ts — PostgreSQL connection pool + job queries
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrate = migrate;
exports.createJob = createJob;
exports.updateJobStatus = updateJobStatus;
exports.getJob = getJob;
exports.getJobStatusFromDB = getJobStatusFromDB;
exports.withTransaction = withTransaction;
exports.closePool = closePool;
const pg_1 = require("pg");
const logger_1 = require("./logger");
// ── Connection Pool (singleton, lazy) ──────────────────────────
let _pool = null;
function getPool() {
    if (_pool)
        return _pool;
    if (!process.env.PG_USER || !process.env.PG_PASSWORD) {
        throw new Error("PG_USER and PG_PASSWORD environment variables are required");
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
    _pool.on("error", (err) => {
        logger_1.logger.error("PG pool background error", { message: err.message });
        // Do NOT destroy the pool here — let the next query attempt reconnect
    });
    return _pool;
}
// ── Startup Migration ──────────────────────────────────────────
const MIGRATION_SQL = `
  CREATE TABLE IF NOT EXISTS jobs (
    job_id      TEXT PRIMARY KEY,
    status      TEXT NOT NULL DEFAULT 'uploaded',
    ocr_engine  TEXT,
    ai_model    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_jobs_status     ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
`;
async function migrate() {
    const pool = getPool();
    await pool.query(MIGRATION_SQL);
    logger_1.logger.info("DB migration complete");
}
// ── Job CRUD ───────────────────────────────────────────────────
async function createJob(job_id) {
    const pool = getPool();
    await pool.query("INSERT INTO jobs (job_id, status, created_at, updated_at) VALUES ($1, 'uploaded', NOW(), NOW())", [job_id]);
    logger_1.logger.info("Job created in DB", { job_id });
}
async function updateJobStatus(job_id, status, ocr_engine, ai_model) {
    const pool = getPool();
    await pool.query(`UPDATE jobs
        SET status     = $1,
            ocr_engine = COALESCE($2, ocr_engine),
            ai_model   = COALESCE($3, ai_model),
            updated_at = NOW()
      WHERE job_id = $4`, [status, ocr_engine ?? null, ai_model ?? null, job_id]);
    logger_1.logger.info("Job status updated", { job_id, status });
}
async function getJob(job_id) {
    const pool = getPool();
    const r = await pool.query("SELECT job_id, status, ocr_engine, ai_model, created_at, updated_at FROM jobs WHERE job_id = $1", [job_id]);
    return r.rows[0] ?? null;
}
async function getJobStatusFromDB(job_id) {
    const pool = getPool();
    const r = await pool.query("SELECT status FROM jobs WHERE job_id = $1", [job_id]);
    return r.rows[0]?.status ?? null;
}
// ── Transaction Helper ─────────────────────────────────────────
async function withTransaction(fn) {
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    }
    catch (e) {
        await client.query("ROLLBACK");
        throw e;
    }
    finally {
        client.release();
    }
}
// ── Graceful Shutdown ──────────────────────────────────────────
async function closePool() {
    if (_pool) {
        await _pool.end();
        _pool = null;
        logger_1.logger.info("PG pool closed");
    }
}
//# sourceMappingURL=postgresClient.js.map