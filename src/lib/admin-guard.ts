import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * The authorisation boundary for the admin.
 *
 * `src/middleware.ts` only redirects on a missing cookie and cannot verify
 * anything, because the Edge runtime cannot load bcrypt or the Postgres
 * driver. THIS is the check that actually decides. Every admin page and every
 * mutating action calls it — not the layout alone, because a Server Action is
 * a POST endpoint that is reachable without ever rendering the layout that
 * "protects" it.
 *
 * That is the failure mode worth naming: guarding an admin by putting a check
 * in `layout.tsx` feels sufficient and is not. Actions must guard themselves.
 */

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

/** Current user, or null. Use when absence is a legitimate outcome. */
export async function getUser(): Promise<AdminUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.email) return null;

  return {
    id: user.id ?? "",
    email: user.email,
    name: user.name ?? user.email,
    role: (user as { role?: string }).role ?? "editor",
  };
}

/**
 * Current user, or redirect to sign-in.
 *
 * Returns a non-null user, so callers cannot forget to handle the signed-out
 * case — `redirect()` throws, which ends rendering before anything sensitive
 * is read.
 */
export async function requireUser(): Promise<AdminUser> {
  const user = await getUser();
  if (!user) redirect("/admin/sign-in");
  return user;
}

/**
 * Guard for a mutation.
 *
 * Throws rather than redirects: a Server Action that quietly redirects on an
 * authorisation failure looks to the caller like it succeeded.
 */
export async function requireUserForAction(): Promise<AdminUser> {
  const user = await getUser();
  if (!user) throw new Error("Not signed in.");
  return user;
}
