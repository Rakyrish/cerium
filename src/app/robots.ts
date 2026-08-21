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
        /*
         * Query-parameter URLs are duplicates of their clean counterparts.
         *
         * `/search` is disallowed for a stronger reason than duplication: it is
         * an infinite URL space. Every distinct `?q=` is a new address, so left
         * crawlable it becomes a page generator producing thin, near-identical
         * results pages that compete with the product and range pages actually
         * meant to rank, and it spends crawl budget that should go to the 122
         * product pages.
         *
         * The page also sets `noindex, follow` itself. Both are needed and they
         * do different jobs: robots.txt stops the crawl, the meta tag handles a
         * URL discovered another way — a shared link, say — that robots.txt
         * never gets consulted for. `follow` keeps the canonical destinations
         * reachable from such a page.
         */
        disallow: ["/api/", "/admin", "/search", "/*?product=", "/*?q="],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.url,
  };
}
