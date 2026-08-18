/**
 * Content access layer — the seam between the UI and the data source.
 *
 * Pages and sections MUST read content through these functions and never import
 * from `src/data` directly. Today every function resolves against the local
 * typed data. When the Django REST API arrives (Phase 2) only this file
 * changes: each function gains a `fetch` against `apiConfig.baseUrl` with the
 * local data kept as the fallback. No component is touched.
 *
 * The functions are async purely so that swap requires no signature change and
 * no component becomes newly-suspending later.
 */

import type {
  Application,
  Category,
  Industry,
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
  applications,
  getApplicationBySlug,
  getIndustryBySlug,
  industries,
} from "@/data/applications";

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
