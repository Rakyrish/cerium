import { asc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/admin-guard";
import { getDb, schema } from "@/db";
import { ProductEditor } from "@/components/admin/ProductEditor";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  await requireUser();
  const db = getDb();

  if (!db) {
    return (
      <p className="rounded-sm border border-error/25 bg-error/5 px-4 py-3 text-small text-error">
        No database configured.
      </p>
    );
  }

  const [rows, categories, sources, formatRows] = await Promise.all([
    db
      .select({
        id: schema.products.id,
        slug: schema.products.slug,
        name: schema.products.name,
        benefit: schema.products.benefit,
        olfactive: schema.products.olfactive,
        published: schema.products.published,
        categorySlug: schema.categories.slug,
        categoryName: schema.categories.name,
        sourceSlug: schema.sourceDocuments.slug,
      })
      .from(schema.products)
      .innerJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .innerJoin(
        schema.sourceDocuments,
        eq(schema.products.sourceId, schema.sourceDocuments.id),
      )
      .orderBy(asc(schema.products.name)),

    db
      .select({ slug: schema.categories.slug, name: schema.categories.name })
      .from(schema.categories)
      .orderBy(asc(schema.categories.name)),

    db
      .select({ slug: schema.sourceDocuments.slug, title: schema.sourceDocuments.title })
      .from(schema.sourceDocuments)
      .orderBy(asc(schema.sourceDocuments.title)),

    db
      .select({
        productId: schema.productFormats.productId,
        name: schema.formats.name,
      })
      .from(schema.productFormats)
      .innerJoin(schema.formats, eq(schema.productFormats.formatId, schema.formats.id))
      .orderBy(asc(schema.productFormats.position)),
  ]);

  const formatsByProduct = new Map<number, string[]>();
  for (const row of formatRows) {
    const list = formatsByProduct.get(row.productId);
    if (list) list.push(row.name);
    else formatsByProduct.set(row.productId, [row.name]);
  }

  return (
    <div>
      <h1 className="text-h3 font-semibold text-text">Products</h1>
      <p className="mt-2 max-w-[72ch] text-small text-text-muted">
        {rows.length} products. Benefit copy must be the wording from a Cerium
        document — never a paraphrase, and never a claim about performance that
        no document makes.
      </p>

      <div className="mt-8">
        <ProductEditor
          products={rows.map((row) => ({
            id: row.id,
            slug: row.slug,
            name: row.name,
            benefit: row.benefit ?? "",
            olfactive: row.olfactive ?? "",
            published: row.published,
            categorySlug: row.categorySlug,
            categoryName: row.categoryName,
            source: row.sourceSlug,
            formats: (formatsByProduct.get(row.id) ?? []).join(", "),
          }))}
          categories={categories}
          sources={sources}
        />
      </div>
    </div>
  );
}
