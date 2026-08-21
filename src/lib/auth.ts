import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { getDb, schema } from "@/db";

/**
 * Admin authentication.
 *
 * ---------------------------------------------------------------------------
 * CREDENTIALS, AND WHY THERE IS NO SIGN-UP
 * ---------------------------------------------------------------------------
 * Accounts are created on the server with `npm run db:admin`. There is no
 * registration route, no password-reset endpoint and no "invite a user" screen,
 * because a catalogue site has no reason to accept them and each one is a
 * public endpoint that mutates the users table. Adding a colleague is a
 * deliberate act performed by someone with shell access.
 *
 * ---------------------------------------------------------------------------
 * JWT SESSIONS, NOT DATABASE SESSIONS
 * ---------------------------------------------------------------------------
 * The session is a signed cookie, so authorising a request costs no query.
 * That matters because the middleware runs on every admin navigation. The
 * trade-off is that revoking access is not instant — a signed session stays
 * valid until it expires. With a handful of staff accounts and a 7-day maximum
 * that is the right trade; if it stops being right, switch to the database
 * strategy and accept the per-request read.
 */

const db = getDb();

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Fail closed if AUTH_SECRET is missing rather than falling back to an
  // insecure default: an unsigned session cookie is worse than no login page.
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: "/admin/sign-in",
    error: "/admin/sign-in",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const email =
          typeof raw?.email === "string" ? raw.email.trim().toLowerCase() : "";
        const password = typeof raw?.password === "string" ? raw.password : "";

        if (!email || !password) return null;
        if (!db) {
          console.error("[auth] no database configured — cannot sign in");
          return null;
        }

        const rows = await db
          .select({
            id: schema.users.id,
            email: schema.users.email,
            name: schema.users.name,
            passwordHash: schema.users.passwordHash,
            role: schema.users.role,
          })
          .from(schema.users)
          .where(sql`lower(${schema.users.email}) = ${email}`)
          .limit(1);

        const user = rows[0];

        /*
         * Compare a hash even when the account does not exist.
         *
         * Returning early on an unknown email makes the response measurably
         * faster than a wrong password, which turns this endpoint into an
         * oracle for which addresses have accounts. Hashing a throwaway value
         * keeps both paths the same order of magnitude.
         */
        if (!user) {
          await bcrypt.compare(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin");
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Only what the session needs. The hash never leaves this function.
        return {
          id: String(user.id),
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "editor";
        token.uid = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        (session.user as { role?: string }).role =
          (token.role as string) ?? "editor";
      }
      return session;
    },
  },
});

/** True when a database exists and sign-in can therefore work at all. */
export const isAuthConfigured = Boolean(
  process.env.AUTH_SECRET && getDb() !== null,
);
