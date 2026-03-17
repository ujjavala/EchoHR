#!/usr/bin/env node
import pg from "pg";
import { loadDotEnv } from "../src/lib/env.mjs";

loadDotEnv();

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("POSTGRES_URL or DATABASE_URL required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });

async function main() {
  const res = await pool.query("SELECT * FROM echohr_events ORDER BY updated_at DESC");
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
