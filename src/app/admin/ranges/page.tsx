import { asc, eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/admin-guard";
import { getDb, schema } from "@/db";
import { RangeEditor } from "@/components/admin/RangeEditor";

export const dynamic = "force-dynamic";

export default async function AdminRangesPage() {
  await requireUser();
  const db = getDb();

  if (!db) {
    return (
      <p className="rounded-sm border border-error/25 bg-error/5 px-4 py-3 text-small text-error">
        No database configured.
      </p>
    );
  }

  const [rows, sources] = await Promise.all([
    db
      .select({
        id: schema.categories.id,
        slug: schema.categories.slug,
        name: schema.categories.name,
        summary: schema.categories.summary,
        parentId: schema.categories.parentId,
        sourceSlug: schema.sourceDocuments.slug,
        productCount: sql<number>`(select count(*)::int from products p where p.category_id = ${schema.categories.id})`,
      })
      .from(schema.categories)
      .innerJoin(
        schema.sourceDocuments,
        eq(schema.categories.sourceId, schema.sourceDocuments.id),
      )
      .orderBy(asc(schema.categories.position), asc(schema.categories.name)),

    db
      .select({ slug: schema.sourceDocuments.slug, title: schema.sourceDocuments.title })
      .from(schema.sourceDocuments)
      .orderBy(asc(schema.sourceDocuments.title)),
  ]);

  const slugById = new Map(rows.map((row) => [row.id, row.slug]));

  return (
    <div>
      <h1 className="text-h3 font-semibold text-text">Ranges</h1>
      <p className="mt-2 max-w-[72ch] text-small text-text-muted">
        {rows.length} ranges. A range only gets a public page once it has
        products or sub-ranges, so an empty one cannot ship as a thin page.
      </p>

      <div className="mt-8">
        <RangeEditor
          ranges={rows.map((row) => ({
            id: row.id,
            slug: row.slug,
            name: row.name,
            summary: row.summary ?? "",
            parentSlug: row.parentId ? (slugById.get(row.parentId) ?? "") : "",
            source: row.sourceSlug,
            productCount: row.productCount,
          }))}
          sources={sources}
        />
      </div>
    </div>
  );
}
