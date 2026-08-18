import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { CompanyIntro } from "@/components/sections/CompanyIntro";
import {
  CategoryRail,
  ProductCategories,
  type CategoryWithCount,
} from "@/components/sections/ProductCategories";
import { Applications, Industries } from "@/components/sections/Applications";
import { Partners, Values } from "@/components/sections/Values";
import { CTA } from "@/components/sections/CTA";
import {
  fetchApplications,
  fetchApplicationsForIndustry,
  fetchCategories,
  fetchIndustries,
  fetchProductCount,
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/config/site";
import { siteMedia } from "@/data/media";

export const metadata: Metadata = buildMetadata({
  title: "Specialty raw materials for personal care and home care",
  description: siteConfig.description,
  path: "/",
});

/**
 * Homepage.
 *
 * A Server Component. Every section above renders on the server and ships no
 * JavaScript except the small `Reveal` observer and the header — which is what
 * keeps the HTML fully populated for crawlers. (The current Netlify prototype
 * serves an empty shell to crawlers; this is the fix.)
 *
 * All content is read through `@/lib/content`, never from `@/data` directly, so
 * the Django swap in Phase 2 does not touch this file.
 */
export default async function HomePage() {
  const [categories, applications, industries] = await Promise.all([
    fetchCategories(),
    fetchApplications(),
    fetchIndustries(),
  ]);

  const categoriesWithCounts: CategoryWithCount[] = await Promise.all(
    categories.map(async (category) => ({
      category,
      productCount: await fetchProductCount(category),
    })),
  );

  const industriesWithApplications = await Promise.all(
    industries.map(async (industry) => ({
      industry,
      applications: await fetchApplicationsForIndustry(industry),
    })),
  );

  // Sub-families used for the secondary discovery rail. Derived, not listed.
  const subFamilies = categories.flatMap((category) => category.children ?? []);

  return (
    <>
      {/* Set `siteMedia.hero.image` in src/data/media.ts and the hero switches
          from its typographic treatment to a full-bleed image automatically. */}
      <Hero categories={categories} image={siteMedia.hero.image} />
      <CompanyIntro />
      <ProductCategories items={categoriesWithCounts} />
      <CategoryRail
        eyebrow="Browse by range"
        title="Explore the catalogue in detail"
        categories={subFamilies}
      />
      <Applications applications={applications} />
      <Industries items={industriesWithApplications} />
      <Values />
      <Partners />
      <CTA />
    </>
  );
}
