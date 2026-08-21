import { asc, desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/admin-guard";
import { getDb, schema } from "@/db";
import { MediaManager } from "@/components/admin/MediaManager";
import { cloudinaryServerConfig } from "@/config/site";

export const dynamic = "force-dynamic";

/**
 * Media library and assignment.
 *
 * Two distinct jobs on one screen, because they are one workflow: upload the
 * picture, then say what it is a picture of. Splitting them across tabs makes
 * the second step easy to forget, which is how an image library fills up with
 * assets nothing references.
 */
export default async function AdminMediaPage() {
  await requireUser();
  const db = getDb();

  if (!db) {
    return (
      <p className="rounded-sm border border-error/25 bg-error/5 px-4 py-3 text-small text-error">
        No database configured.
      </p>
    );
  }

  const [library, productRows, categoryRows, siteRows] = await Promise.all([
    db
      .select({
        id: schema.mediaAssets.id,
        cloudinaryId: schema.mediaAssets.cloudinaryId,
        originalFilename: schema.mediaAssets.originalFilename,
        width: schema.mediaAssets.width,
        height: schema.mediaAssets.height,
        bytes: schema.mediaAssets.bytes,
      })
      .from(schema.mediaAssets)
      .orderBy(desc(schema.mediaAssets.createdAt)),

    db
      .select({
        slug: schema.products.slug,
        name: schema.products.name,
        categoryName: schema.categories.name,
        mediaId: schema.products.mediaId,
        mediaAlt: schema.products.mediaAlt,
      })
      .from(schema.products)
      .innerJoin(
        schema.categories,
        eq(schema.products.categoryId, schema.categories.id),
      )
      .orderBy(asc(schema.products.name)),

    db
      .select({
        slug: schema.categories.slug,
        name: schema.categories.name,
        mediaId: schema.categories.mediaId,
        mediaAlt: schema.categories.mediaAlt,
      })
      .from(schema.categories)
      .orderBy(asc(schema.categories.name)),

    db
      .select({
        slot: schema.siteMedia.slot,
        mediaId: schema.siteMedia.mediaId,
        alt: schema.siteMedia.alt,
      })
      .from(schema.siteMedia),
  ]);

  const siteLabels: Record<string, string> = {
    hero: "Homepage hero",
    companyIntro: "Homepage — who we are",
    aboutPortrait: "About page portrait",
  };

  const siteBySlot = new Map(siteRows.map((row) => [row.slot, row]));

  return (
    <div>
      <h1 className="text-h3 font-semibold text-text">Media</h1>
      <p className="mt-2 max-w-[72ch] text-small text-text-muted">
        Upload images once, then attach them to a product, a range, or a fixed
        position on the site. Anything unassigned keeps showing the labelled
        &ldquo;Image pending&rdquo; placeholder, which is a safe state.
      </p>

      <div className="mt-8">
        <MediaManager
          cloudName={cloudinaryServerConfig.cloudName}
          uploadsEnabled={cloudinaryServerConfig.isConfigured}
          library={library.map((row) => ({
            id: row.id,
            cloudinaryId: row.cloudinaryId,
            label: row.originalFilename ?? row.cloudinaryId,
            width: row.width ?? 0,
            height: row.height ?? 0,
            bytes: row.bytes ?? 0,
          }))}
          site={Object.entries(siteLabels).map(([slot, label]) => ({
            scope: "site" as const,
            key: slot,
            label,
            mediaId: siteBySlot.get(slot)?.mediaId ?? null,
            alt: siteBySlot.get(slot)?.alt ?? "",
          }))}
          products={productRows.map((row) => ({
            scope: "product" as const,
            key: row.slug,
            label: row.name,
            context: row.categoryName,
            mediaId: row.mediaId,
            alt: row.mediaAlt,
          }))}
          categories={categoryRows.map((row) => ({
            scope: "category" as const,
            key: row.slug,
            label: row.name,
            mediaId: row.mediaId,
            alt: row.mediaAlt,
          }))}
        />
      </div>
    </div>
  );
}
