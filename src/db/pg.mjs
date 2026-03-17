import pg from "pg";

const { Pool } = pg;
let pool = null;

export function getPg() {
  if (pool) return pool;
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) return null;
  pool = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 5)
  });
  return pool;
}
