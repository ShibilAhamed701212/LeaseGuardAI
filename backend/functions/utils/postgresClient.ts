// utils/postgresClient.ts — PostgreSQL connection pool + job queries

import { Pool, type PoolClient } from "pg";
import { logger } from "./logger";

export type JobStatus = "uploaded" | "processing" | "completed" | "failed" | "deleted";

export interface JobRecord {
  job_id: string;
  status: JobStatus;
  ocr_engine: string | null;
  ai_model: string | null;
  created_at: Date;
  updated_at: Date;
}

// ── Connection Pool (singleton, lazy) ──────────────────────────

let _pool: Pool | null = null;

function getPool(): Pool {
  if (_pool) return _pool;

  if (!process.env.PG_USER || !process.env.PG_PASSWORD) {
    throw new Error("PG_USER and PG_PASSWORD environment variables are required");
  }

  _pool = new Pool({
    host: process.env.PG_HOST ?? "localhost",
    port: parseInt(process.env.PG_PORT ?? "5432", 10),
    database: process.env.PG_DATABASE ?? "ocr_agent",
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  _pool.on("error", (err) => {
    logger.error("PG pool background error", { message: err.message });
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

export async function migrate(): Promise<void> {
  const pool = getPool();
  await pool.query(MIGRATION_SQL);
  logger.info("DB migration complete");
}

// ── Job CRUD ───────────────────────────────────────────────────

export async function createJob(job_id: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    "INSERT INTO jobs (job_id, status, created_at, updated_at) VALUES ($1, 'uploaded', NOW(), NOW())",
    [job_id]
  );
  logger.info("Job created in DB", { job_id });
}

export async function updateJobStatus(
  job_id: string,
  status: JobStatus,
  ocr_engine?: string,
  ai_model?: string
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE jobs
        SET status     = $1,
            ocr_engine = COALESCE($2, ocr_engine),
            ai_model   = COALESCE($3, ai_model),
            updated_at = NOW()
      WHERE job_id = $4`,
    [status, ocr_engine ?? null, ai_model ?? null, job_id]
  );
  logger.info("Job status updated", { job_id, status });
}

export async function getJob(job_id: string): Promise<JobRecord | null> {
  const pool = getPool();
  const r = await pool.query<JobRecord>(
    "SELECT job_id, status, ocr_engine, ai_model, created_at, updated_at FROM jobs WHERE job_id = $1",
    [job_id]
  );
  return r.rows[0] ?? null;
}

export async function getJobStatusFromDB(job_id: string): Promise<JobStatus | null> {
  const pool = getPool();
  const r = await pool.query<{ status: JobStatus }>(
    "SELECT status FROM jobs WHERE job_id = $1",
    [job_id]
  );
  return r.rows[0]?.status ?? null;
}

// ── Transaction Helper ─────────────────────────────────────────

export async function withTransaction<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// ── Graceful Shutdown ──────────────────────────────────────────

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    logger.info("PG pool closed");
  }
}