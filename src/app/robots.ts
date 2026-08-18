import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/config/site";

/**
 * robots.txt
 *
 * NEXT_PUBLIC_ALLOW_INDEXING must be set to "true" for the site to be
 * crawlable. Anything else — including unset — disallows everything.
 *
 * Defaulting to disallow is deliberate: staging and preview deployments getting
 * indexed is a genuine and hard-to-undo SEO problem, and an accidentally
 * blocked production site is far easier to notice and fix than a duplicate
 * staging site competing with it in the index.
 */
export default function robots(): MetadataRoute.Robots {
  const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

  if (!allowIndexing) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Query-parameter URLs are duplicates of their clean counterparts.
        disallow: ["/api/", "/*?product="],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.url,
  };
}
