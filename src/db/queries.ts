import "server-only";

import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { cloudinaryConfig } from "@/config/site";
import type {
  Application,
  Category,
  ImageRef,
  Industry,
  ProductSummary,
  SourceDocument,
} from "@/types/content";

/**
 * Reads that produce the shapes the UI already consumes.
 *
 * The whole point of this file is that NOTHING DOWNSTREAM CHANGES. Every
 * function returns the same `Category` / `ProductSummary` / `Application` /
 * `Industry` objects the typed local data produced, so the swap from
 * TypeScript to Postgres is invisible to every page and component. That was
 * the promise `lib/content.ts` made when it declared all its accessors async;
 * this is it being kept.
 *
 * Each function returns `null` when no database is configured, so
 * `lib/content.ts` can fall back to the reviewed local data rather than having
 * to distinguish "empty result" from "no database".
 */

/* -------------------------------------------------------------------------- */
/* Mapping                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Build an `ImageRef` from a media row.
 *
 * `cloudinaryId` rather than `src`, because that is the field `CeriumImage`
 * routes through the Cloudinary loader for format negotiation and responsive
 * widths. When Cloudinary is not configured the id would not resolve, so no
 * image is returned at all and the honest "Image pending" placeholder renders
 * instead of a broken picture.
 */
function toImage(
  cloudinaryId: string | null | undefined,
  alt: string | null | undefined,
): ImageRef | undefined {
  if (!cloudinaryId || !cloudinaryConfig.isConfigured) return undefined;
  return { cloudinaryId, alt: alt ?? "" };
}

type ProductRow = {
  slug: string;
  name: string;
  benefit: string | null;
  olfactive: string | null;
  categorySlug: string;
  categoryName: string;
  sourceSlug: string;
  cloudinaryId: string | null;
  mediaAlt: string | null;
  formats: string[];
};

function toProduct(row: ProductRow): ProductSummary {
  return {
    slug: row.slug,
    name: row.name,
    benefit: row.benefit ?? undefined,
    olfactive: row.olfactive ?? undefined,
    categorySlug: row.categorySlug,
    categoryName: row.categoryName,
    formats: row.formats.length > 0 ? row.formats : undefined,
    image: toImage(row.cloudinaryId, row.mediaAlt),
    source: row.sourceSlug as SourceDocument,
  };
}

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The whole category tree with products attached.
 *
 * Read in three flat queries and assembled in memory rather than with a
 * recursive CTE per node. At this size — 30 categories, 122 products — three
 * round trips beat any amount of SQL cleverness, and the assembly is plain
 * enough to verify by reading.
 */
export async function dbFetchCategoryTree(): Promise<Category[] | null> {
  const db = getDb();
  if (!db) return null;

  const [categoryRows, productRows, formatRows] = await Promise.all([
    db
      .select({
        id: schema.categories.id,
        slug: schema.categories.slug,
        name: schema.categories.name,
        summary: schema.categories.summary,
        parentId: schema.categories.parentId,
        position: schema.categories.position,
        sourceSlug: schema.sourceDocuments.slug,
        cloudinaryId: schema.mediaAssets.cloudinaryId,
        mediaAlt: schema.categories.mediaAlt,
      })
      .from(schema.categories)
      .innerJoin(
        schema.sourceDocuments,
        eq(schema.categories.sourceId, schema.sourceDocuments.id),
      )
      .leftJoin(
        schema.mediaAssets,
        eq(schema.categories.mediaId, schema.mediaAssets.id),
      )
      .orderBy(asc(schema.categories.position), asc(schema.categories.id)),

    db
      .select({
        id: schema.products.id,
        slug: schema.products.slug,
        name: schema.products.name,
        benefit: schema.products.benefit,
        olfactive: schema.products.olfactive,
        categoryId: schema.products.categoryId,
        position: schema.products.position,
        published: schema.products.published,
        sourceSlug: schema.sourceDocuments.slug,
        cloudinaryId: schema.mediaAssets.cloudinaryId,
        mediaAlt: schema.products.mediaAlt,
      })
      .from(schema.products)
      .innerJoin(
        schema.sourceDocuments,
        eq(schema.products.sourceId, schema.sourceDocuments.id),
      )
      .leftJoin(
        schema.mediaAssets,
        eq(schema.products.mediaId, schema.mediaAssets.id),
      )
      .orderBy(asc(schema.products.position), asc(schema.products.id)),

    db
      .select({
        productId: schema.productFormats.productId,
        name: schema.formats.name,
        position: schema.productFormats.position,
      })
      .from(schema.productFormats)
      .innerJoin(
        schema.formats,
        eq(schema.productFormats.formatId, schema.formats.id),
      )
      .orderBy(asc(schema.productFormats.position)),
  ]);

  if (categoryRows.length === 0) return null;

  const formatsByProduct = new Map<number, string[]>();
  for (const row of formatRows) {
    const list = formatsByProduct.get(row.productId);
    if (list) list.push(row.name);
    else formatsByProduct.set(row.productId, [row.name]);
  }

  const categoryById = new Map(categoryRows.map((row) => [row.id, row]));

  const productsByCategory = new Map<number, ProductSummary[]>();
  for (const row of productRows) {
    // An unpublished product is withheld from the public site entirely — it
    // must not appear in a listing, a sitemap or a related-products rail.
    if (!row.published) continue;

    const parent = categoryById.get(row.categoryId);
    if (!parent) continue;

    const product = toProduct({
      slug: row.slug,
      name: row.name,
      benefit: row.benefit,
      olfactive: row.olfactive,
      categorySlug: parent.slug,
      categoryName: parent.name,
      sourceSlug: row.sourceSlug,
      cloudinaryId: row.cloudinaryId,
      mediaAlt: row.mediaAlt,
      formats: formatsByProduct.get(row.id) ?? [],
    });

    const list = productsByCategory.get(row.categoryId);
    if (list) list.push(product);
    else productsByCategory.set(row.categoryId, [product]);
  }

  // Applications are attached per category so `applicationSlugs` keeps working.
  const appLinks = await db
    .select({
      categoryId: schema.applicationCategories.categoryId,
      applicationSlug: schema.applications.slug,
    })
    .from(schema.applicationCategories)
    .innerJoin(
      schema.applications,
      eq(schema.applicationCategories.applicationId, schema.applications.id),
    );

  const appsByCategory = new Map<number, string[]>();
  for (const link of appLinks) {
    const list = appsByCategory.get(link.categoryId);
    if (list) list.push(link.applicationSlug);
    else appsByCategory.set(link.categoryId, [link.applicationSlug]);
  }

  const childrenByParent = new Map<number | null, typeof categoryRows>();
  for (const row of categoryRows) {
    const key = row.parentId;
    const list = childrenByParent.get(key);
    if (list) list.push(row);
    else childrenByParent.set(key, [row]);
  }

  function build(parentId: number | null): Category[] {
    return (childrenByParent.get(parentId) ?? []).map((row) => {
      const children = build(row.id);
      const products = productsByCategory.get(row.id) ?? [];
      return {
        slug: row.slug,
        name: row.name,
        summary: row.summary ?? undefined,
        image: toImage(row.cloudinaryId, row.mediaAlt),
        children: children.length > 0 ? children : undefined,
        applicationSlugs: appsByCategory.get(row.id),
        products: products.length > 0 ? products : undefined,
        source: row.sourceSlug as SourceDocument,
      } satisfies Category;
    });
  }

  return build(null);
}

export async function dbFetchApplications(): Promise<Application[] | null> {
  const db = getDb();
  if (!db) return null;

  const rows = await db
    .select({
      id: schema.applications.id,
      slug: schema.applications.slug,
      name: schema.applications.name,
      description: schema.applications.description,
      groupSlug: schema.applications.groupSlug,
      sourceSlug: schema.sourceDocuments.slug,
      cloudinaryId: schema.mediaAssets.cloudinaryId,
      mediaAlt: schema.applications.mediaAlt,
    })
    .from(schema.applications)
    .innerJoin(
      schema.sourceDocuments,
      eq(schema.applications.sourceId, schema.sourceDocuments.id),
    )
    .leftJoin(
      schema.mediaAssets,
      eq(schema.applications.mediaId, schema.mediaAssets.id),
    )
    .orderBy(asc(schema.applications.position), asc(schema.applications.id));

  if (rows.length === 0) return null;

  const links = await db
    .select({
      applicationId: schema.applicationCategories.applicationId,
      categorySlug: schema.categories.slug,
    })
    .from(schema.applicationCategories)
    .innerJoin(
      schema.categories,
      eq(schema.applicationCategories.categoryId, schema.categories.id),
    );

  const byApplication = new Map<number, string[]>();
  for (const link of links) {
    const list = byApplication.get(link.applicationId);
    if (list) list.push(link.categorySlug);
    else byApplication.set(link.applicationId, [link.categorySlug]);
  }

  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    groupSlug: row.groupSlug ?? undefined,
    categorySlugs: byApplication.get(row.id) ?? [],
    image: toImage(row.cloudinaryId, row.mediaAlt),
    source: row.sourceSlug as SourceDocument,
  }));
}

export async function dbFetchIndustries(): Promise<Industry[] | null> {
  const db = getDb();
  if (!db) return null;

  const rows = await db
    .select({
      id: schema.industries.id,
      slug: schema.industries.slug,
      name: schema.industries.name,
      description: schema.industries.description,
      sourceSlug: schema.sourceDocuments.slug,
      cloudinaryId: schema.mediaAssets.cloudinaryId,
      mediaAlt: schema.industries.mediaAlt,
    })
    .from(schema.industries)
    .innerJoin(
      schema.sourceDocuments,
      eq(schema.industries.sourceId, schema.sourceDocuments.id),
    )
    .leftJoin(
      schema.mediaAssets,
      eq(schema.industries.mediaId, schema.mediaAssets.id),
    )
    .orderBy(asc(schema.industries.position), asc(schema.industries.id));

  if (rows.length === 0) return null;

  const links = await db
    .select({
      industryId: schema.industryApplications.industryId,
      applicationSlug: schema.applications.slug,
    })
    .from(schema.industryApplications)
    .innerJoin(
      schema.applications,
      eq(schema.industryApplications.applicationId, schema.applications.id),
    );

  const byIndustry = new Map<number, string[]>();
  for (const link of links) {
    const list = byIndustry.get(link.industryId);
    if (list) list.push(link.applicationSlug);
    else byIndustry.set(link.industryId, [link.applicationSlug]);
  }

  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    applicationSlugs: byIndustry.get(row.id) ?? [],
    image: toImage(row.cloudinaryId, row.mediaAlt),
    source: row.sourceSlug as SourceDocument,
  }));
}

/** Editorial slots, keyed by slot name. */
export async function dbFetchSiteMedia(): Promise<Record<string, ImageRef> | null> {
  const db = getDb();
  if (!db) return null;

  const rows = await db
    .select({
      slot: schema.siteMedia.slot,
      alt: schema.siteMedia.alt,
      cloudinaryId: schema.mediaAssets.cloudinaryId,
    })
    .from(schema.siteMedia)
    .leftJoin(
      schema.mediaAssets,
      eq(schema.siteMedia.mediaId, schema.mediaAssets.id),
    );

  const result: Record<string, ImageRef> = {};
  for (const row of rows) {
    const image = toImage(row.cloudinaryId, row.alt);
    if (image) result[row.slot] = image;
  }
  return result;
}
