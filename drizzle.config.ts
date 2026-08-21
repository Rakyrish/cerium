import type { Config } from "drizzle-kit";

/**
 * Drizzle Kit configuration.
 *
 * Migrations are generated into `drizzle/` and committed. They are a reviewed
 * artefact like any other code — `db:push` is deliberately not wired up as a
 * script, because pushing a schema diff straight at a database is how a column
 * gets dropped in production without anyone having read the statement that did
 * it.
 */
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
