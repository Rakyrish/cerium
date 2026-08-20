/**
 * Apply pending migrations.
 *
 * Run against a live database:  npm run db:migrate
 *
 * Deliberately a separate step from `next build` and from container start. A
 * migration that runs automatically on boot will, sooner or later, run twice
 * concurrently because two replicas started at once, or run against the wrong
 * database because an env var was mistyped. Applying schema changes is an
 * operation someone performs and watches.
 */

import { config } from "dotenv";
config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  console.log("Applying migrations from ./drizzle …");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");

  await pool.end();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
