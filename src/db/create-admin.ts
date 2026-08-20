/**
 * Create or update an admin account.
 *
 *   npm run db:admin -- you@example.com "Your Name"
 *
 * The password is prompted for and never passed as an argument, because a
 * command-line argument lands in the shell history file and in the process
 * list, where any other user on the machine can read it.
 *
 * THIS IS THE ONLY WAY AN ACCOUNT IS CREATED. There is no sign-up route and no
 * "create user" screen in the admin — a B2B catalogue has no reason to accept
 * registrations, and an endpoint that creates users is an endpoint that can be
 * abused. Adding a colleague is a deliberate act performed on the server.
 */

import { config } from "dotenv";
config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

import * as schema from "@/db/schema";

/** Cost factor. 12 is the current sensible default: slow enough to matter. */
const BCRYPT_ROUNDS = 12;

async function prompt(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });

  if (!hidden) {
    const answer = await rl.question(question);
    rl.close();
    return answer.trim();
  }

  // Suppress echo so the password does not appear on screen or in a scrollback
  // buffer someone else may later read.
  const originalWrite = stdout.write.bind(stdout);
  let muted = false;
  (stdout as NodeJS.WriteStream & { write: typeof originalWrite }).write = ((
    chunk: string | Uint8Array,
    ...rest: unknown[]
  ) => {
    if (muted) return true;
    return (originalWrite as (c: unknown, ...r: unknown[]) => boolean)(chunk, ...rest);
  }) as typeof originalWrite;

  const pending = rl.question(question);
  muted = true;
  const answer = await pending;
  muted = false;
  stdout.write = originalWrite;
  stdout.write("\n");
  rl.close();
  return answer.trim();
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const [emailArg, nameArg] = process.argv.slice(2);
  const email = (emailArg ?? (await prompt("Email: "))).toLowerCase().trim();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("That does not look like an email address.");
    process.exit(1);
  }

  const name = nameArg ?? (await prompt("Display name: "));
  const password = await prompt("Password: ", true);

  // Length is the property that actually matters for a bcrypt-hashed password;
  // composition rules mostly produce predictable substitutions.
  if (password.length < 12) {
    console.error("Use at least 12 characters.");
    process.exit(1);
  }

  const confirm = await prompt("Confirm password: ", true);
  if (password !== confirm) {
    console.error("Passwords do not match.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(sql`lower(${schema.users.email}) = ${email}`)
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(schema.users)
      .set({ passwordHash, name: name || null, role: "admin" })
      .where(eq(schema.users.id, existing[0].id));
    console.log(`Updated password for ${email}.`);
  } else {
    await db
      .insert(schema.users)
      .values({ email, name: name || null, passwordHash, role: "admin" });
    console.log(`Created admin ${email}.`);
  }

  await pool.end();
}

main().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
