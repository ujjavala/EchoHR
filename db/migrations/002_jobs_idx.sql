ALTER TABLE echohr_jobs ADD COLUMN IF NOT EXISTS last_error TEXT;
CREATE INDEX IF NOT EXISTS echohr_jobs_processing_idx ON echohr_jobs(status, updated_at);
