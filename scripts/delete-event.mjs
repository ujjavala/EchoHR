#!/usr/bin/env node
import pg from "pg";
import { loadDotEnv } from "../src/lib/env.mjs";

loadDotEnv();

const pageId = process.argv[2];
if (!pageId) {
  console.error("Usage: node scripts/delete-event.mjs <page_id>");
  process.exit(1);
}

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("POSTGRES_URL or DATABASE_URL required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });

async function main() {
  await pool.query("DELETE FROM echohr_events WHERE page_id = $1", [pageId]);
  console.log(`Deleted event for page ${pageId}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
