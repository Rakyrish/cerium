import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";
import {
  fetchAllProductParams,
  fetchApplications,
  fetchCategories,
  fetchIndustries,
} from "@/lib/content";
import { flattenCategories, isIndexable } from "@/data/taxonomy";

/**
 * Sitemap.
 *
 * Generated from the same data that generates the routes, so it can never list
 * a page that does not exist or omit one that does — the most common way
 * sitemaps rot.
 *
 * Only real, indexable pages are listed. Planned routes (insights, resources,
 * legal) are deliberately absent until they exist.
 *
 * `priority` is a weak signal at best; it is set to reflect genuine site
 * structure rather than to game anything.
 *
 * NO `lastModified` IS EMITTED, deliberately.
 *
 * The only timestamp available here is build time, and stamping that on every
 * URL tells search engines the entire site changed every time the image is
 * rebuilt — which is false, and on a new site with a small crawl allocation it
 * spends that allocation re-crawling pages that did not change. An omitted
 * lastmod is ignored; a lastmod that is always "now" teaches a crawler to
 * distrust the whole file.
 *
 * The content layer has no per-entity modification date to report (see
 * `src/types/content.ts`), so there is nothing honest to put here. Phase 2
 * reinstates this from a real `updated_at` on the database record.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [topCategories, applications, industries, productParams] =
    await Promise.all([
      fetchCategories(),
      fetchApplications(),
      fetchIndustries(),
      fetchAllProductParams(),
    ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "monthly", priority: 1 },
    { url: absoluteUrl("/products"), changeFrequency: "monthly", priority: 0.9 },
    { url: absoluteUrl("/applications"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/industries"), changeFrequency: "yearly", priority: 0.7 },
    { url: absoluteUrl("/about"), changeFrequency: "yearly", priority: 0.6 },
    { url: absoluteUrl("/contact"), changeFrequency: "yearly", priority: 0.6 },
  ];

  // Categories that earn the long-tail search traffic.
  //
  // Filtered by `isIndexable` rather than `isPublishable`: a range with no
  // products anywhere beneath it has a page, but nothing on it to rank, and a
  // sitemap that advertises thin pages invites them to be judged as a set. The
  // page still exists and is still linked — it is just not submitted. See
  // `isIndexable` in taxonomy.ts for why that distinction is drawn there.
  const categoryRoutes: MetadataRoute.Sitemap = flattenCategories(topCategories)
    .filter(isIndexable)
    .map((category) => ({
      url: absoluteUrl(`/products/${category.slug}`),
      changeFrequency: "monthly",
      priority: 0.8,
    }));

  // Product detail pages, from the same pairs that generate the routes and the
  // internal links — so the sitemap lists the canonical URL for each product
  // and cannot advertise one of the non-canonical ancestor paths, which the
  // route itself 404s.
  const productRoutes: MetadataRoute.Sitemap = productParams.map((params) => ({
    url: absoluteUrl(`/products/${params.category}/${params.product}`),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const applicationRoutes: MetadataRoute.Sitemap = applications.map((application) => ({
    url: absoluteUrl(`/applications/${application.slug}`),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const industryRoutes: MetadataRoute.Sitemap = industries.map((industry) => ({
    url: absoluteUrl(`/industries/${industry.slug}`),
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...productRoutes,
    ...applicationRoutes,
    ...industryRoutes,
  ];
}
