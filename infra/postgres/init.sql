-- OCR Agent — PostgreSQL initialization
-- Runs automatically on first container start

CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS n8n;

-- Jobs table (metadata only — no file content)
CREATE TABLE IF NOT EXISTS public.jobs (
  job_id      TEXT PRIMARY KEY,
  status      TEXT NOT NULL DEFAULT 'uploaded',
  ocr_engine  TEXT,
  ai_model    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status     ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS jobs_updated_at ON public.jobs;
CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();