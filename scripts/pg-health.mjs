#!/usr/bin/env node
import pg from "pg";
import { loadDotEnv } from "../src/lib/env.mjs";

loadDotEnv();

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("POSTGRES_URL or DATABASE_URL is required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString, max: Number(process.env.PG_POOL_MAX || 5) });

async function main() {
  const res = await pool.query("SELECT 1 AS ok");
  console.log("pg-health ok", res.rows[0]);
  await pool.end();
}

main().catch((err) => {
  console.error("pg-health failed", err.message);
  process.exit(1);
});
