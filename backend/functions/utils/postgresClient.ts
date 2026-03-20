// utils/postgresClient.ts — PostgreSQL metadata service (NO file content stored)

import { Pool, type PoolClient } from "pg";
import { logger } from "./logger";

export type JobStatus = "uploaded" | "processing" | "completed" | "failed" | "deleted";

export interface JobRecord {
  job_id:     string;
  status:     JobStatus;
  ocr_engine: string | null;
  ai_model:   string | null;
  created_at: Date;
  updated_at: Date;
}

let _pool: Pool | null = null;

function getPool(): Pool {
  if (_pool) return _pool;

  _pool = new Pool({
    host:     process.env.PG_HOST     ?? "localhost",
    port:     parseInt(process.env.PG_PORT ?? "5432", 10),
    database: process.env.PG_DATABASE ?? "ocr_agent",
    user:     process.env.PG_USER     ?? "postgres",
    password: process.env.PG_PASSWORD ?? "postgres",
    max:      10,
    idleTimeoutMillis:    30000,
    connectionTimeoutMillis: 5000,
  });
  _pool.on("error", (err) => logger.error("PG pool error", { message: err.message }));
  return _pool;
}

/** Run DB migrations — creates jobs table if not exists */
export async function migrate(): Promise<void> {
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
  logger.info("DB migration complete");
}

/** Create a new job record */
export async function createJob(job_id: string): Promise<void> {
  await getPool().query(
    `INSERT INTO jobs (job_id, status, created_at, updated_at)
     VALUES ($1, 'uploaded', NOW(), NOW())`,
    [job_id]
  );
  logger.info("Job created in DB", { job_id });
}

/** Update job status + optional engine/model info */
export async function updateJobStatus(
  job_id:     string,
  status:     JobStatus,
  ocr_engine?: string,
  ai_model?:   string
): Promise<void> {
  await getPool().query(
    `UPDATE jobs
     SET status     = $2,
         ocr_engine = COALESCE($3, ocr_engine),
         ai_model   = COALESCE($4, ai_model),
         updated_at = NOW()
     WHERE job_id   = $1`,
    [job_id, status, ocr_engine ?? null, ai_model ?? null]
  );
  logger.info("Job status updated", { job_id, status });
}

/** Fetch a single job record */
export async function getJob(job_id: string): Promise<JobRecord | null> {
  const res = await getPool().query<JobRecord>(
    `SELECT job_id, status, ocr_engine, ai_model, created_at, updated_at
     FROM jobs WHERE job_id = $1`,
    [job_id]
  );
  return res.rows[0] ?? null;
}

/** Fetch only the status of a job (fast) */
export async function getJobStatusFromDB(job_id: string): Promise<JobStatus | null> {
  const res = await getPool().query<{ status: JobStatus }>(
    `SELECT status FROM jobs WHERE job_id = $1`,
    [job_id]
  );
  return res.rows[0]?.status ?? null;
}

/** Wrap operations in a transaction */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}