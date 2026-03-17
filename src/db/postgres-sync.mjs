import { getPg } from "./pg.mjs";

export async function syncToPostgres({ pageId, dbKey, title, updatedAt, payload }) {
  const pg = getPg();
  if (!pg) return { ok: false, skipped: true, reason: "Postgres not configured" };
  await pg.query(`
    CREATE TABLE IF NOT EXISTS echohr_events (
      page_id TEXT PRIMARY KEY,
      db_key TEXT,
      title TEXT,
      updated_at TIMESTAMPTZ,
      payload JSONB
    );
  `);
  try {
    await pg.query(
      `INSERT INTO echohr_events (page_id, db_key, title, updated_at, payload)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (page_id) DO UPDATE
         SET db_key = EXCLUDED.db_key,
             title = EXCLUDED.title,
             updated_at = EXCLUDED.updated_at,
             payload = EXCLUDED.payload`,
      [pageId, dbKey, title, updatedAt || new Date().toISOString(), payload || {}]
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
