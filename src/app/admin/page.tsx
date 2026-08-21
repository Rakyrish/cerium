import Link from "next/link";
import { sql } from "drizzle-orm";
import { requireUser } from "@/lib/admin-guard";
import { getDb, schema, isDatabaseConfigured } from "@/db";
import { cloudinaryServerConfig } from "@/config/site";

export const dynamic = "force-dynamic";

/**
 * Overview.
 *
 * Leads with what is missing rather than what exists. On a catalogue where no
 * product has a photograph, "0 of 122 products have an image" is the only
 * number anyone needs — a row of green tiles reporting healthy totals would
 * hide the single thing worth acting on.
 */
export default async function AdminHome() {
  const user = await requireUser();
  const db = getDb();

  let stats = { products: 0, categories: 0, withImage: 0, media: 0 };

  if (db) {
    const [[p], [c], [wi], [m]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(schema.products),
      db.select({ n: sql<number>`count(*)::int` }).from(schema.categories),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.products)
        .where(sql`${schema.products.mediaId} is not null`),
      db.select({ n: sql<number>`count(*)::int` }).from(schema.mediaAssets),
    ]);
    stats = { products: p.n, categories: c.n, withImage: wi.n, media: m.n };
  }

  const missing = stats.products - stats.withImage;

  return (
    <div>
      <h1 className="text-h3 font-semibold text-text">
        Welcome back, {user.name.split(" ")[0]}
      </h1>

      {!isDatabaseConfigured && (
        <p className="mt-6 rounded-sm border border-error/25 bg-error/5 px-4 py-3 text-small text-error">
          No database is configured. The public site is serving the reviewed
          catalogue from source; nothing saved here will persist.
        </p>
      )}

      {!cloudinaryServerConfig.isConfigured && (
        <p className="mt-6 rounded-sm border border-warning/30 bg-warning/5 px-4 py-3 text-small text-warning">
          Cloudinary is not configured, so images cannot be uploaded yet. Set
          CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET and
          NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.
        </p>
      )}

      <dl className="mt-8 grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Products" value={stats.products} href="/admin/products" />
        <Stat label="Ranges" value={stats.categories} href="/admin/ranges" />
        <Stat label="Images in library" value={stats.media} href="/admin/media" />
        <Stat
          label="Products without an image"
          value={missing}
          href="/admin/media"
          alert={missing > 0}
        />
      </dl>

      <div className="mt-10 max-w-[70ch] rounded-sm border border-border bg-surface p-6">
        <h2 className="text-h4 font-semibold">Before you edit</h2>
        <ul className="mt-3 flex flex-col gap-2 text-small text-text-muted">
          <li>
            Every product and range records the Cerium document its copy came
            from. That field is required — it is what keeps the catalogue
            defensible.
          </li>
          <li>
            Never enter a CAS number, INCI name, specification or certification
            that is not written in a supplied document.
          </li>
          <li>
            A product&rsquo;s web address is fixed when it is created. Renaming a
            product changes its title, not its URL.
          </li>
          <li>
            Saving rebuilds the affected public pages automatically; changes are
            live within a few seconds.
          </li>
        </ul>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  alert = false,
}: {
  label: string;
  value: number;
  href: string;
  alert?: boolean;
}) {
  return (
    <Link href={href} className="group bg-surface p-6 transition-colors hover:bg-background-soft">
      <dt className="text-caption uppercase tracking-wide text-text-muted">
        {label}
      </dt>
      <dd
        className={
          alert
            ? "mt-2 font-display text-[2.25rem] leading-none text-error"
            : "mt-2 font-display text-[2.25rem] leading-none text-primary"
        }
      >
        {value}
      </dd>
    </Link>
  );
}
