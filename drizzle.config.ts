import { existsSync } from "node:fs";
import path from "node:path";
import type { Config } from "drizzle-kit";
import { config as loadEnv } from "dotenv";

/**
 * Drizzle Kit configuration.
 *
 * Migrations are generated into `drizzle/` and committed. They are a reviewed
 * artefact like any other code — `db:push` is deliberately not wired up as a
 * script, because pushing a schema diff straight at a database is how a column
 * gets dropped in production without anyone having read the statement that did
 * it.
 *
 * ---------------------------------------------------------------------------
 * CONFIGURATION COMES FROM THE ROOT .env
 * ---------------------------------------------------------------------------
 * drizzle-kit is a standalone CLI, so it does not inherit the loading that
 * `next.config.ts` does for the application. It is loaded here for the same
 * reason and in the same way: there is one .env for the whole project.
 *
 * `override: false` keeps a real environment variable winning over the file,
 * so `DATABASE_URL=... npm run db:generate` still does what it looks like.
 *
 * Note this reads DATABASE_URL — the legacy database this app still owns — and
 * NOT DJANGO_DATABASE_URL. Pointing drizzle-kit at Django's database would put
 * two migration systems on one schema, which is corruption, not a shortcut.
 */
const rootEnv = path.resolve(__dirname, "..", ".env");
if (existsSync(rootEnv)) {
  loadEnv({ path: rootEnv, override: false });
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
} satisfies Config;
