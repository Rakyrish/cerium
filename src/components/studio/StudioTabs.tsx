"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/studio", label: "Catalogue" },
  { href: "/studio/products", label: "Add product" },
  { href: "/studio/images", label: "Images" },
];

/** Studio navigation. Real links, so each tab is bookmarkable and reloadable. */
export function StudioTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Studio sections">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
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
