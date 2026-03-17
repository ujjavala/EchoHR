#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";
import { loadDotEnv, requireEnv } from "../src/lib/env.mjs";

loadDotEnv();

const migrationsDir = "db/migrations";
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("POSTGRES_URL or DATABASE_URL required for migrations");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString, max: Number(process.env.PG_POOL_MAX || 5) });

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS echohr_migrations (
      id serial primary key,
      filename text unique,
      run_at timestamptz default now()
    );
  `);
}

async function applied() {
  const res = await pool.query("SELECT filename FROM echohr_migrations");
  return new Set(res.rows.map((r) => r.filename));
}

async function runMigration(file) {
  const sql = await readFile(join(migrationsDir, file), "utf8");
  await pool.query("BEGIN");
  try {
    await pool.query(sql);
    await pool.query("INSERT INTO echohr_migrations(filename) VALUES($1) ON CONFLICT DO NOTHING", [file]);
    await pool.query("COMMIT");
    console.log("Applied", file);
  } catch (e) {
    await pool.query("ROLLBACK");
    throw e;
  }
}

async function main() {
  await ensureTable();
  const done = await applied();
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    if (done.has(f)) continue;
    await runMigration(f);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
