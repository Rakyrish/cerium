import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/admin/SignInForm";
import { getUser } from "@/lib/admin-guard";
import { isDatabaseConfigured } from "@/db";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false, nocache: true },
};

/** Rendered per request — it depends on the session cookie. */
export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const { from, error } = await searchParams;

  // Already signed in — do not show a login form to someone who is logged in.
  if (await getUser()) redirect(from && from.startsWith("/admin") ? from : "/admin");

  // No Container here: the admin layout already provides the page measure.
  return (
    <div className="mx-auto max-w-md py-10">
      <div>
          <h1 className="text-h3 font-semibold text-text">Cerium admin</h1>
          <p className="mt-2 text-small text-text-muted">
            Sign in to manage the catalogue and its images.
          </p>

          {!isDatabaseConfigured ? (
            <p className="mt-8 rounded-sm border border-error/25 bg-error/5 px-4 py-3 text-small text-error">
              No database is configured, so sign-in is unavailable. Set
              DATABASE_URL and run the migrations.
            </p>
          ) : (
            <div className="mt-8">
              {/* `from` is only ever used for an internal admin path — see the
                  redirect guard in the form action. */}
              <SignInForm from={from} initialError={error} />
            </div>
          )}
      </div>
    </div>
  );
}
