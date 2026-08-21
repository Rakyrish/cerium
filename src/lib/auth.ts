import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { adminAuthConfig, apiConfig, siteConfig } from "@/config/site";

/**
 * Admin authentication.
 *
 * ---------------------------------------------------------------------------
 * ONE SET OF LOGINS. DJANGO HOLDS THEM.
 * ---------------------------------------------------------------------------
 * This used to read a Drizzle `users` table and compare a bcrypt hash, while
 * Django kept its own `auth_user` with PBKDF2 in a different database. Two
 * stores for one person: two passwords to change, and — the failure that
 * matters — an account you deactivate in one place that still signs in to the
 * other. Deactivating someone is precisely when a second copy is unaffordable.
 *
 * Django is the backend of record, so `auth_user` is the identity store. This
 * provider posts the credentials to `/api/admin/auth/verify/` and trusts the
 * answer. The same username or email and the same password work at `/admin`
 * here and at `/django-admin/` there, because there is only one record.
 *
 * Accounts are created with `python manage.py create_admin` on the backend.
 * There is still no sign-up route, no password-reset endpoint and no
 * user-management screen anywhere in either application.
 *
 * ---------------------------------------------------------------------------
 * JWT SESSIONS, NOT DATABASE SESSIONS
 * ---------------------------------------------------------------------------
 * The session is a signed cookie, so authorising a request costs no query or
 * API call. That matters because the middleware runs on every admin
 * navigation. The trade-off is sharper now that Django owns identity: a signed
 * session outlives the account it represents, so deactivating someone in
 * Django stops them signing in AGAIN but does not kill a live session until it
 * expires. With a handful of staff and a 7-day maximum that is the right
 * trade; if it stops being right, switch to the database strategy and accept
 * the per-request read.
 */

/** How long to wait on the backend before treating sign-in as failed. */
const VERIFY_TIMEOUT_MS = 8_000;

interface VerifiedUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Ask Django whether these credentials are valid.
 *
 * Returns null for any failure — bad credentials, a misconfigured token, an
 * unreachable backend. The caller cannot tell them apart and must not: this
 * runs on a login form, and distinguishing "wrong password" from "no such
 * user" hands an attacker a way to enumerate accounts.
 *
 * There is deliberately NO fallback to a local users table when the backend is
 * down. A fallback would be a second identity store, which is the entire thing
 * this replaced — and it would come back to life at exactly the wrong moment.
 * Sign-in failing while Django is down is the correct behaviour.
 */
async function verifyWithBackend(
  identifier: string,
  password: string,
): Promise<VerifiedUser | null> {
  if (!apiConfig.isConfigured || !adminAuthConfig.isConfigured) {
    console.error(
      "[auth] DJANGO_API_URL or ADMIN_AUTH_SERVICE_TOKEN is not set — " +
        "the admin cannot verify credentials.",
    );
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiConfig.baseUrl}/api/admin/auth/verify/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Token": adminAuthConfig.serviceToken,
      },
      body: JSON.stringify({ identifier, password }),
      signal: controller.signal,
      // Never cached. A cached authentication response is an authentication
      // bypass waiting for the second person to type the same username.
      cache: "no-store",
    });

    if (response.status === 401) return null;

    if (response.status === 403) {
      // The service token is wrong or unset. This is an operator error, not a
      // user error, and it would otherwise look exactly like a bad password.
      console.error(
        "[auth] Django rejected the service token — check that " +
          "ADMIN_AUTH_SERVICE_TOKEN matches on both sides.",
      );
      return null;
    }

    if (response.status === 429) {
      console.warn("[auth] credential verification is being rate limited.");
      return null;
    }

    if (!response.ok) {
      console.error(`[auth] verification failed: HTTP ${response.status}`);
      return null;
    }

    const user = (await response.json()) as Partial<VerifiedUser>;
    if (!user?.id || !user.username) {
      console.error("[auth] verification returned an unusable payload.");
      return null;
    }

    return {
      id: String(user.id),
      username: user.username,
      email: user.email ?? "",
      name: user.name || user.username,
      role: user.role === "admin" ? "admin" : "editor",
    };
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? `no response within ${VERIFY_TIMEOUT_MS}ms`
        : String(error);
    console.error(`[auth] could not reach the backend to verify: ${reason}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Pin the origin Auth.js builds its redirects from.
 *
 * Next 16's standalone server derives a route handler's absolute request URL
 * from the HOSTNAME and PORT it binds to — 0.0.0.0:3000 in the container — and
 * does NOT take it from the Host or X-Forwarded-Host header, though it does
 * honour X-Forwarded-Proto. Auth.js then redirects to
 * `https://0.0.0.0:3000/admin/sign-in`, which no browser can reach.
 *
 * `AUTH_URL` is the only lever: next-auth's `reqWithEnvURL()` rewrites the
 * request's origin from it before the handler sees the request, and there is
 * no equivalent option on the config object. It is derived from the site URL
 * rather than added as a separate variable because they can never legitimately
 * differ, and two variables holding one origin is one of them going stale.
 * `??=` so an explicit AUTH_URL still wins.
 */
process.env.AUTH_URL ??= siteConfig.url;

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Fail closed if AUTH_SECRET is missing rather than falling back to an
  // insecure default: an unsigned session cookie is worse than no login page.
  secret: process.env.AUTH_SECRET,

  // Caddy is the only way in. It terminates TLS and reverse-proxies to this
  // container, which is `expose`d and never published, so the Host reaching
  // Next.js is always one Caddy matched against its own site addresses — an
  // arbitrary Host cannot be injected from outside.
  //
  // next-auth defaults trustHost to true in development and FALSE in
  // production. Left unset, every /api/auth/* call in the container is
  // rejected as UntrustedHost, and the error redirect is then built from the
  // standalone server's HOSTNAME=0.0.0.0 and PORT=3000 — sending the browser
  // to https://0.0.0.0:3000/admin/sign-in?error=Configuration. It is set here
  // rather than via AUTH_TRUST_HOST because being behind a proxy is a
  // permanent property of this application in production, not of one
  // deployment: an env var can be omitted from the next compose file and
  // reproduce the outage silently.
  trustHost: true,
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
        // Django's USERNAME_FIELD is `username`, and the verification endpoint
        // resolves an email to it. Either works, so the field says so.
        identifier: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const identifier =
          typeof raw?.identifier === "string" ? raw.identifier.trim() : "";
        const password = typeof raw?.password === "string" ? raw.password : "";

        if (!identifier || !password) return null;

        const user = await verifyWithBackend(identifier, password);
        if (!user) return null;

        // Only what the session needs. No hash is ever handled here any more —
        // this process never sees one.
        return {
          id: user.id,
          email: user.email || user.username,
          name: user.name,
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

/**
 * True when sign-in can work at all.
 *
 * No longer depends on the local database: identity lives in Django now, and
 * the admin's own database connection is a separate concern from whether
 * anyone can log in.
 */
export const isAuthConfigured = Boolean(
  process.env.AUTH_SECRET && apiConfig.isConfigured && adminAuthConfig.isConfigured,
);
