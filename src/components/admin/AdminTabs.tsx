"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/ranges", label: "Ranges" },
];

/** Real links, so every admin screen is bookmarkable and reloadable. */
export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active =
            tab.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center border-b-2 px-4 text-nav font-medium transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
