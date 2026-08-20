/**
 * Content access layer — the seam between the UI and the data source.
 *
 * ---------------------------------------------------------------------------
 * THE RULE
 * ---------------------------------------------------------------------------
 * **Catalogue records — categories, products, applications, industries — are
 * read only through these functions.**
 *
 * That is narrower than the rule this file used to state ("never import from
 * `src/data` directly"), which was stricter than the codebase has ever been and
 * stricter than it needs to be. Three kinds of import are NOT covered and are
 * fine as direct imports:
 *
 *   - pure predicates and tree helpers (`isPublishable`, `flattenCategories`)
 *     — logic, not a data source;
 *   - non-catalogue content (`company.ts`, `media.ts`) — see the note below;
 *   - the development-only Content Studio, which is exempt by design.
 *
 * ---------------------------------------------------------------------------
 * NON-CATALOGUE CONTENT — a decided question, not an open one
 * ---------------------------------------------------------------------------
 * `company.ts` and `media.ts` stay as directly-imported build-time modules and
 * deliberately get no accessors here. They are small, editorial, change at the
 * pace of the brand rather than the catalogue, and nothing about the Phase 2
 * API migration requires them to move. If company content later becomes
 * API-backed, it gains accessors then — as a decision, not as drift.
 *
 * `navigation.ts` is the exception and has moved behind the seam, because it is
 * *derived from* catalogue records: `fetchPrimaryNavigation` and friends below.
 *
 * ---------------------------------------------------------------------------
 * WHY EVERY FUNCTION IS ASYNC
 * ---------------------------------------------------------------------------
 * Today they all resolve against the local typed data. When the Django REST API
 * arrives (Phase 2) only this file changes: each function gains a `fetch`
 * against `apiConfig.baseUrl` with the local data kept as the fallback. The
 * async signatures mean that swap requires no caller signature change and makes
 * no component newly-suspending.
 *
 * This only holds for *server* callers. A client component cannot await a
 * module-scope import, so client components receive what they need as props
 * from a server parent — see `fetchPrimaryNavigation` and `fetchBrowseLists`.
 */

import type {
  Application,
  BrowseLists,
  Category,
  Industry,
  NavColumn,
  NavItem,
  ProductSummary,
} from "@/types/content";
import {
  categories,
  countProducts,
  flattenCategories,
  getAllProducts,
  getCategoryBySlug,
  getProductsInCategory,
  isPublishable,
} from "@/data/taxonomy";
import {
  applicationFormats,
  applications,
  getApplicationBySlug,
  getIndustryBySlug,
  industries,
} from "@/data/applications";
import {
  buildBrowseLists,
  buildFooterNavigation,
  buildPrimaryNavigation,
} from "@/data/navigation";

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

export async function fetchCategories(): Promise<Category[]> {
  return categories;
}

export async function fetchCategory(slug: string): Promise<Category | null> {
  return getCategoryBySlug(slug) ?? null;
}

/**
 * Slugs that get a page — used for static params and the sitemap.
 *
 * Filtered by `isPublishable`, so a sub-range with no products and no children
 * never produces a thin page or a dead link.
 */
export async function fetchAllCategorySlugs(): Promise<string[]> {
  return flattenCategories().filter(isPublishable).map((category) => category.slug);
}

export async function fetchProductsInCategory(
  category: Category,
): Promise<ProductSummary[]> {
  return getProductsInCategory(category);
}

export async function fetchProductCount(category: Category): Promise<number> {
  return countProducts(category);
}

/** Total distinct products currently modelled. Derived, never hardcoded. */
export async function fetchTotalProductCount(): Promise<number> {
  return getAllProducts().length;
}

/**
 * A single product by slug.
 *
 * Phase 1 has no product detail route, so the only caller today is the contact
 * page resolving `?product=<slug>` for a pre-composed enquiry. It exists here
 * rather than as a `getAllProducts().find()` at the call site because that is a
 * catalogue record read, and because Phase 2 turns it into a single indexed
 * lookup instead of a full-catalogue scan.
 */
export async function fetchProduct(
  slug: string,
): Promise<ProductSummary | null> {
  return getAllProducts().find((product) => product.slug === slug) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Applications                                                                */
/* -------------------------------------------------------------------------- */

export async function fetchApplications(): Promise<Application[]> {
  return applications;
}

export async function fetchApplication(
  slug: string,
): Promise<Application | null> {
  return getApplicationBySlug(slug) ?? null;
}

/**
 * End-product formats Cerium names in the Q3 2026 fragrance price list.
 *
 * Display-only today, and a plain string array — but it is catalogue content,
 * not site furniture, and it becomes a first-class entity when product data is
 * ingested. Reading it through the seam now means that promotion is a change to
 * this file rather than to the two pages that render it.
 */
export async function fetchApplicationFormats(): Promise<ReadonlyArray<string>> {
  return applicationFormats;
}

/**
 * Products that serve an application.
 *
 * Phase 1 resolves this through the category relationships declared in the data
 * layer. Phase 2 replaces it with a real many-to-many join in PostgreSQL — the
 * return shape is identical, so `ApplicationSection` needs no change.
 */
export async function fetchProductsForApplication(
  application: Application,
): Promise<ProductSummary[]> {
  const slugs = new Set(application.categorySlugs ?? []);
  return flattenCategories()
    .filter((category) => slugs.has(category.slug))
    .flatMap(getProductsInCategory);
}

/** Categories that supply an application. Drives internal linking. */
export async function fetchCategoriesForApplication(
  application: Application,
): Promise<Category[]> {
  const slugs = new Set(application.categorySlugs ?? []);
  return flattenCategories().filter((category) => slugs.has(category.slug));
}

/* -------------------------------------------------------------------------- */
/* Industries                                                                  */
/* -------------------------------------------------------------------------- */

export async function fetchIndustries(): Promise<Industry[]> {
  return industries;
}

export async function fetchIndustry(slug: string): Promise<Industry | null> {
  return getIndustryBySlug(slug) ?? null;
}

export async function fetchApplicationsForIndustry(
  industry: Industry,
): Promise<Application[]> {
  const slugs = new Set(industry.applicationSlugs ?? []);
  return applications.filter((application) => slugs.has(application.slug));
}

/* -------------------------------------------------------------------------- */
/* Navigation                                                                  */
/* -------------------------------------------------------------------------- */

/*
 * Navigation is derived from catalogue records, so it belongs behind the seam
 * even though it is not itself a record.
 *
 * These are what keep the catalogue out of the browser. `Header`,
 * `MobileNavigation` and `SearchOverlay` are client components; they receive
 * the finished link structures as props from a server parent rather than
 * importing the data modules and deriving it themselves. What crosses the
 * boundary is roughly a dozen labels and hrefs instead of the whole tree.
 */

export async function fetchPrimaryNavigation(): Promise<NavItem[]> {
  const [cats, apps, inds] = await Promise.all([
    fetchCategories(),
    fetchApplications(),
    fetchIndustries(),
  ]);
  return buildPrimaryNavigation(cats, apps, inds);
}

export async function fetchFooterNavigation(): Promise<NavColumn[]> {
  const [cats, apps] = await Promise.all([
    fetchCategories(),
    fetchApplications(),
  ]);
  return buildFooterNavigation(cats, apps);
}

/** The browse fallback inside the search overlay. Labels and hrefs only. */
export async function fetchBrowseLists(): Promise<BrowseLists> {
  const [cats, apps] = await Promise.all([
    fetchCategories(),
    fetchApplications(),
  ]);
  return buildBrowseLists(cats, apps);
}
