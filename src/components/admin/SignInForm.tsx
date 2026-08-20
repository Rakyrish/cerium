"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

/**
 * Sign-in form.
 *
 * The error message is deliberately identical for an unknown email and a wrong
 * password. Distinguishing them tells an attacker which addresses have
 * accounts, which is the first step of a targeted attempt.
 */
export function SignInForm({
  from,
  initialError,
}: {
  from?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(
    initialError ? "Email or password is incorrect." : null,
  );
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
    });

    setBusy(false);

    if (!result || result.error) {
      setError("Email or password is incorrect.");
      return;
    }

    // Only ever follow an internal admin path. An open redirect here would let
    // a crafted link bounce a freshly-authenticated user to another origin.
    const destination = from && from.startsWith("/admin") ? from : "/admin";
    router.push(destination);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {error && (
        <p
          role="alert"
          className="rounded-sm border border-error/25 bg-error/5 px-4 py-3 text-small text-error"
        >
          {error}
        </p>
      )}

      <div>
        <label htmlFor="email" className="text-small font-medium text-text">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="mt-2 h-11 w-full rounded-sm border border-border bg-surface px-3 text-small"
        />
      </div>

      <div>
        <label htmlFor="password" className="text-small font-medium text-text">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 h-11 w-full rounded-sm border border-border bg-surface px-3 text-small"
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-11 items-center justify-center rounded-sm bg-primary px-6 text-button font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-45"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-caption text-text-muted">
        Accounts are created on the server. There is no public sign-up.
      </p>
    </form>
  );
}
