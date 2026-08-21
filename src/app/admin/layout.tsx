import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { getUser } from "@/lib/admin-guard";

/**
 * The admin is never indexable.
 *
 * `robots.ts` disallows the whole site unless indexing is switched on, but this
 * does not depend on that: an admin surface must be noindex on its own terms,
 * so turning indexing on for the public site can never expose it.
 */
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Not the security boundary — each page calls `requireUser()` itself. This
  // is only so the chrome can show who is signed in.
  const user = await getUser();

  return (
    <div className="min-h-screen bg-background-soft">
      <header className="border-b border-border bg-surface">
        <Container>
          <div className="flex h-16 items-center justify-between gap-6">
            <div className="flex items-baseline gap-3">
              <Link href="/admin" className="text-h4 font-semibold text-text">
                Cerium admin
              </Link>
              <Link
                href="/"
                className="text-caption text-text-muted underline underline-offset-4 hover:text-primary"
              >
                View site
              </Link>
            </div>
            {user && (
              <div className="flex items-center gap-4">
                <span className="hidden text-caption text-text-muted sm:inline">
                  {user.email}
                </span>
                <SignOutButton />
              </div>
            )}
          </div>
          {user && <AdminTabs />}
        </Container>
      </header>

      <main>
        <Container>
          <div className="py-10">{children}</div>
        </Container>
      </main>
    </div>
  );
}
