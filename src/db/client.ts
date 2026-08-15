import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and configure it.",
  );
}

/**
 * Small, lazy pool. A low connection cap keeps memory down and lets Railway
 * Serverless sleep the web service when idle (specification section 15).
 */
const globalForDb = globalThis as unknown as {
  __fplSql?: ReturnType<typeof postgres>;
};

const sql =
  globalForDb.__fplSql ??
  postgres(connectionString, {
    max: 2,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__fplSql = sql;
}

export const db = drizzle(sql, { schema });
export { sql };
