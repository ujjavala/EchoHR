import { getPg } from "./pg.mjs";

export async function enqueueJob(jobType, payload) {
  const pg = getPg();
  if (!pg) return { ok: false, skipped: true, reason: "Postgres not configured" };
  await pg.query(
    "INSERT INTO echohr_jobs(job_type, payload, status) VALUES($1,$2,'pending')",
    [jobType, payload]
  );
  return { ok: true };
}

export async function fetchJobs(limit = 5) {
  const pg = getPg();
  if (!pg) return [];
  const res = await pg.query(
    "UPDATE echohr_jobs SET status='processing', updated_at=now() WHERE id IN (SELECT id FROM echohr_jobs WHERE status='pending' ORDER BY created_at LIMIT $1 FOR UPDATE SKIP LOCKED) RETURNING *",
    [limit]
  );
  return res.rows || [];
}

export async function completeJob(id, ok, message = null) {
  const pg = getPg();
  if (!pg) return;
  await pg.query(
    "UPDATE echohr_jobs SET status=$2, updated_at=now(), last_error=$3, payload = jsonb_set(payload,'{result}', to_jsonb($3::text), true) WHERE id=$1",
    [id, ok ? "done" : "failed", message || (ok ? "ok" : "failed")]
  );
}

export async function pendingCount() {
  const pg = getPg();
  if (!pg) return 0;
  const res = await pg.query("SELECT count(*) AS c FROM echohr_jobs WHERE status='pending'");
  return Number(res.rows[0]?.c || 0);
}
