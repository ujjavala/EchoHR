CREATE TABLE IF NOT EXISTS echohr_events (
  page_id TEXT PRIMARY KEY,
  db_key TEXT,
  title TEXT,
  updated_at TIMESTAMPTZ,
  payload JSONB
);

CREATE TABLE IF NOT EXISTS echohr_jobs (
  id BIGSERIAL PRIMARY KEY,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS echohr_jobs_status_idx ON echohr_jobs(status, created_at);
