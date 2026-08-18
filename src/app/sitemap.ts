import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";
import {
  fetchApplications,
  fetchCategories,
  fetchIndustries,
} from "@/lib/content";
import { flattenCategories, isPublishable } from "@/data/taxonomy";

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
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const [topCategories, applications, industries] = await Promise.all([
    fetchCategories(),
    fetchApplications(),
    fetchIndustries(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "monthly", priority: 1, lastModified },
    { url: absoluteUrl("/products"), changeFrequency: "monthly", priority: 0.9, lastModified },
    { url: absoluteUrl("/applications"), changeFrequency: "monthly", priority: 0.8, lastModified },
    { url: absoluteUrl("/industries"), changeFrequency: "yearly", priority: 0.7, lastModified },
    { url: absoluteUrl("/about"), changeFrequency: "yearly", priority: 0.6, lastModified },
    { url: absoluteUrl("/contact"), changeFrequency: "yearly", priority: 0.6, lastModified },
  ];

  // Every category that actually has a page — these earn the long-tail search
  // traffic. Filtered by `isPublishable` so the sitemap can never advertise a
  // URL that does not exist.
  const categoryRoutes: MetadataRoute.Sitemap = flattenCategories(topCategories)
    .filter(isPublishable)
    .map((category) => ({
      url: absoluteUrl(`/products/${category.slug}`),
      changeFrequency: "monthly",
      priority: 0.8,
      lastModified,
    }));

  const applicationRoutes: MetadataRoute.Sitemap = applications.map((application) => ({
    url: absoluteUrl(`/applications/${application.slug}`),
    changeFrequency: "monthly",
    priority: 0.7,
    lastModified,
  }));

  const industryRoutes: MetadataRoute.Sitemap = industries.map((industry) => ({
    url: absoluteUrl(`/industries/${industry.slug}`),
    changeFrequency: "yearly",
    priority: 0.6,
    lastModified,
  }));

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...applicationRoutes,
    ...industryRoutes,
  ];
}
