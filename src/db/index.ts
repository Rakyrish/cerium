import "server-only";

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";

/**
 * Database connection.
 *
 * ---------------------------------------------------------------------------
 * THE DATABASE IS OPTIONAL, ON PURPOSE
 * ---------------------------------------------------------------------------
 * `DATABASE_URL` may be unset, and everything still has to work. Two situations
 * depend on it:
 *
 *   - `next build` runs in a Docker build stage that has no network route to
 *     the `db` service, so every page that reads the catalogue would fail the
 *     build if a connection were mandatory;
 *   - a developer cloning the repo can run `npm run dev` with no Postgres at
 *     all and still get the whole site, because the reviewed typed catalogue in
 *     `src/data/` is still there.
 *
 * So `lib/content.ts` treats the database as the source of truth WHEN IT IS
 * REACHABLE and falls back to the local typed data otherwise. That is not a
 * hedge — it is what keeps a database outage from turning a static marketing
 * site into a 500, and it is why the seed data must stay in the repo rather
 * than being deleted once Postgres is live.
 *
 * ---------------------------------------------------------------------------
 * WHY A POOL, AND WHY IT IS CACHED ON `globalThis`
 * ---------------------------------------------------------------------------
 * Next's dev server re-evaluates modules on every edit. Without the global
 * cache each hot reload would open a new pool and leak its connections until
 * Postgres refused new ones — the classic symptom being "too many clients" a
 * few minutes into a session. In production the module is evaluated once and
 * the cache is simply unused.
 */

const connectionString = process.env.DATABASE_URL ?? "";

/** Whether a database is configured at all. Checked before every query path. */
export const isDatabaseConfigured = connectionString.length > 0;

type Database = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  ceriumPool?: Pool;
  ceriumDb?: Database;
};

function createPool(): Pool {
  const pool = new Pool({
    connectionString,
    // A single Next server does not need many connections, and a small ceiling
    // makes a runaway query obvious instead of silently exhausting Postgres.
    max: 10,
    idleTimeoutMillis: 30_000,
    // Fail fast rather than hanging a page render for the default 0 (infinite).
    connectionTimeoutMillis: 5_000,
  });

  // A pool emits 'error' for idle clients dropped by the server. Without a
  // listener Node treats it as an unhandled error and takes the process down —
  // a database blip must not kill the web server.
  pool.on("error", (error) => {
    console.error("[db] idle client error", error.message);
  });

  return pool;
}

/**
 * The Drizzle client, or null when no database is configured.
 *
 * Returning null rather than throwing is deliberate: callers in
 * `lib/content.ts` branch on it to choose the local fallback, and an exception
 * would make "no database" indistinguishable from "database is broken".
 */
export function getDb(): Database | null {
  if (!isDatabaseConfigured) return null;

  if (!globalForDb.ceriumDb) {
    globalForDb.ceriumPool ??= createPool();
    globalForDb.ceriumDb = drizzle(globalForDb.ceriumPool, { schema });
  }

  return globalForDb.ceriumDb;
}

export { schema };
