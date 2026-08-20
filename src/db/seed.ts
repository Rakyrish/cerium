/**
 * Seed Postgres from the reviewed typed catalogue.
 *
 * This is the migration from "the data is TypeScript" to "the data is a
 * database". It reads exactly what `src/data/` already contains — 4 families,
 * 30 categories, 122 products, 6 applications, 2 industries — and writes it
 * with provenance intact.
 *
 * SAFE TO RE-RUN. Every write is an upsert keyed on the natural slug, so
 * running it twice does not duplicate anything and running it after an admin
 * edit does not silently revert that edit's unrelated fields — but note that it
 * DOES restore seeded columns to their reviewed values, which is the point: it
 * is the way back to a known-good catalogue.
 *
 * It deliberately does not delete. A product removed from `taxonomy.ts` is not
 * dropped from the database here, because by the time this runs in anger the
 * database is the source of truth and a stale local file must not be able to
 * destroy rows.
 *
 * Usage:  npm run db:seed
 */

import { config } from "dotenv";
config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";

import * as schema from "@/db/schema";
import { categories as reviewedCategories } from "@/data/taxonomy";
import { applications as reviewedApplications, industries as reviewedIndustries } from "@/data/applications";
import { SOURCE_DOCUMENTS } from "@/types/content";
import { slugify } from "@/lib/slug";
import type { Category } from "@/types/content";

/** Human titles for the six supplied documents. Descriptive, not invented. */
const SOURCE_TITLES: Record<string, { title: string; kind: string; revision?: string }> = {
  "catalogue-2026": { title: "Cerium product catalogue", kind: "catalogue", revision: "2026" },
  "pricelist-q3-2026": { title: "Cerium price list", kind: "pricelist", revision: "Q3 2026" },
  "fragrance-pricelist-q3-2026": { title: "Cerium fragrance price list", kind: "pricelist", revision: "Q3 2026" },
  "vision-statement": { title: "Cerium vision statement", kind: "statement" },
  logo: { title: "Cerium logo lockup", kind: "asset" },
  "website-ceriumchemicals.co.ke": { title: "ceriumchemicals.co.ke", kind: "website" },
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "DATABASE_URL is not set. Point it at Postgres and try again:\n" +
        "  DATABASE_URL=postgres://cerium:pass@localhost:5432/cerium npm run db:seed",
    );
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  console.log("Seeding Cerium catalogue…");

  /* ---------------------------------------------------------------- */
  /* Source documents — everything else references these              */
  /* ---------------------------------------------------------------- */
  const sourceIds = new Map<string, number>();

  for (const slug of SOURCE_DOCUMENTS) {
    const meta = SOURCE_TITLES[slug] ?? { title: slug, kind: "unknown" };
    const [row] = await db
      .insert(schema.sourceDocuments)
      .values({ slug, title: meta.title, kind: meta.kind, revision: meta.revision })
      .onConflictDoUpdate({
        target: schema.sourceDocuments.slug,
        set: { title: meta.title, kind: meta.kind, revision: meta.revision ?? null },
      })
      .returning({ id: schema.sourceDocuments.id });
    sourceIds.set(slug, row.id);
  }
  console.log(`  source documents: ${sourceIds.size}`);

  /** Resolve a source slug to an id, falling back to the catalogue. */
  function source(slug: string | undefined): number {
    return sourceIds.get(slug ?? "catalogue-2026") ?? sourceIds.get("catalogue-2026")!;
  }

  /* ---------------------------------------------------------------- */
  /* Categories — depth-first so a parent always exists first         */
  /* ---------------------------------------------------------------- */
  const categoryIds = new Map<string, number>();
  let categoryCount = 0;

  async function upsertCategory(node: Category, parentId: number | null, position: number) {
    const [row] = await db
      .insert(schema.categories)
      .values({
        slug: node.slug,
        name: node.name,
        summary: node.summary ?? null,
        parentId,
        position,
        sourceId: source(node.source),
        status: "authoritative",
      })
      .onConflictDoUpdate({
        target: schema.categories.slug,
        set: {
          name: node.name,
          summary: node.summary ?? null,
          parentId,
          position,
          sourceId: source(node.source),
          updatedAt: new Date(),
        },
      })
      .returning({ id: schema.categories.id });

    categoryIds.set(node.slug, row.id);
    categoryCount += 1;

    const children = node.children ?? [];
    for (const [index, child] of children.entries()) {
      await upsertCategory(child, row.id, index);
    }
  }

  for (const [index, family] of reviewedCategories.entries()) {
    await upsertCategory(family, null, index);
  }
  console.log(`  categories: ${categoryCount}`);

  /* ---------------------------------------------------------------- */
  /* Formats — deduplicated across the catalogue                      */
  /* ---------------------------------------------------------------- */
  const formatIds = new Map<string, number>();

  function collectFormats(nodes: Category[]): string[] {
    return nodes.flatMap((node) => [
      ...(node.products ?? []).flatMap((p) => p.formats ?? []),
      ...collectFormats(node.children ?? []),
    ]);
  }

  for (const name of new Set(collectFormats(reviewedCategories))) {
    const [row] = await db
      .insert(schema.formats)
      .values({ slug: slugify(name), name })
      .onConflictDoUpdate({ target: schema.formats.slug, set: { name } })
      .returning({ id: schema.formats.id });
    formatIds.set(name, row.id);
  }
  console.log(`  formats: ${formatIds.size}`);

  /* ---------------------------------------------------------------- */
  /* Products                                                          */
  /* ---------------------------------------------------------------- */
  let productCount = 0;
  let formatLinks = 0;

  async function upsertProducts(nodes: Category[]) {
    for (const node of nodes) {
      const categoryId = categoryIds.get(node.slug);
      if (categoryId) {
        for (const [index, product] of (node.products ?? []).entries()) {
          const [row] = await db
            .insert(schema.products)
            .values({
              slug: product.slug,
              name: product.name,
              benefit: product.benefit ?? null,
              olfactive: product.olfactive ?? null,
              categoryId,
              position: index,
              sourceId: source(product.source),
              status: "authoritative",
            })
            .onConflictDoUpdate({
              target: schema.products.slug,
              set: {
                name: product.name,
                benefit: product.benefit ?? null,
                olfactive: product.olfactive ?? null,
                categoryId,
                position: index,
                sourceId: source(product.source),
                updatedAt: new Date(),
              },
            })
            .returning({ id: schema.products.id });

          productCount += 1;

          // Rebuild the join rather than diffing it — the set is tiny and a
          // full replace cannot leave a stale row behind.
          await db
            .delete(schema.productFormats)
            .where(eq(schema.productFormats.productId, row.id));

          for (const [fIndex, name] of (product.formats ?? []).entries()) {
            const formatId = formatIds.get(name);
            if (!formatId) continue;
            await db
              .insert(schema.productFormats)
              .values({ productId: row.id, formatId, position: fIndex })
              .onConflictDoNothing();
            formatLinks += 1;
          }
        }
      }
      await upsertProducts(node.children ?? []);
    }
  }

  await upsertProducts(reviewedCategories);
  console.log(`  products: ${productCount} (${formatLinks} format links)`);

  /* ---------------------------------------------------------------- */
  /* Applications and industries                                       */
  /* ---------------------------------------------------------------- */
  const applicationIds = new Map<string, number>();

  for (const [index, application] of reviewedApplications.entries()) {
    const [row] = await db
      .insert(schema.applications)
      .values({
        slug: application.slug,
        name: application.name,
        description: application.description ?? null,
        groupSlug: application.groupSlug ?? null,
        position: index,
        sourceId: source(application.source),
      })
      .onConflictDoUpdate({
        target: schema.applications.slug,
        set: {
          name: application.name,
          description: application.description ?? null,
          groupSlug: application.groupSlug ?? null,
          position: index,
          sourceId: source(application.source),
        },
      })
      .returning({ id: schema.applications.id });

    applicationIds.set(application.slug, row.id);

    await db
      .delete(schema.applicationCategories)
      .where(eq(schema.applicationCategories.applicationId, row.id));

    for (const categorySlug of application.categorySlugs ?? []) {
      const categoryId = categoryIds.get(categorySlug);
      if (!categoryId) continue;
      await db
        .insert(schema.applicationCategories)
        .values({ applicationId: row.id, categoryId })
        .onConflictDoNothing();
    }
  }
  console.log(`  applications: ${applicationIds.size}`);

  for (const [index, industry] of reviewedIndustries.entries()) {
    const [row] = await db
      .insert(schema.industries)
      .values({
        slug: industry.slug,
        name: industry.name,
        description: industry.description ?? null,
        position: index,
        sourceId: source(industry.source),
      })
      .onConflictDoUpdate({
        target: schema.industries.slug,
        set: {
          name: industry.name,
          description: industry.description ?? null,
          position: index,
          sourceId: source(industry.source),
        },
      })
      .returning({ id: schema.industries.id });

    await db
      .delete(schema.industryApplications)
      .where(eq(schema.industryApplications.industryId, row.id));

    for (const applicationSlug of industry.applicationSlugs ?? []) {
      const applicationId = applicationIds.get(applicationSlug);
      if (!applicationId) continue;
      await db
        .insert(schema.industryApplications)
        .values({ industryId: row.id, applicationId })
        .onConflictDoNothing();
    }
  }
  console.log(`  industries: ${reviewedIndustries.length}`);

  /* ---------------------------------------------------------------- */
  /* Site media slots                                                  */
  /* ---------------------------------------------------------------- */
  for (const slot of ["hero", "companyIntro", "aboutPortrait"]) {
    await db
      .insert(schema.siteMedia)
      .values({ slot })
      .onConflictDoNothing();
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.products);

  console.log(`\nDone. ${count} products in the database.`);
  await pool.end();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
