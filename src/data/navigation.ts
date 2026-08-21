/**
 * Navigation architecture.
 *
 * Derived from the taxonomy rather than written out by hand, so adding a
 * product family updates the desktop mega-menu, the mobile drawer and the
 * footer at once. No navigation component contains a hardcoded category.
 *
 * WHY THESE ARE BUILDERS AND NOT CONSTANTS
 *
 * This module used to import the catalogue directly and derive
 * `primaryNavigation` / `footerNavigation` at module scope. That made it a
 * data module as well as a presentation module, and because `Header` and
 * `MobileNavigation` are client components importing it, the entire catalogue —
 * every category, every nested sub-range, all 122 product records — was pulled
 * into the client bundle to render about a dozen links.
 *
 * Taking the catalogue as an argument instead keeps this file as what it should
 * be: the shape of the menu, and nothing else. The data now arrives through
 * `lib/content.ts`, which is also what lets the Phase 2 API swap happen here
 * without touching a navigation component — an API-backed catalogue cannot be a
 * synchronous module-scope import, so the constants could not have survived it.
 *
 * `upcoming: true` marks a destination that is planned but not yet built. The
 * UI renders those as non-interactive so a visitor is never sent to a dead end.
 */

import type {
  Application,
  BrowseLists,
  Category,
  Industry,
  NavColumn,
  NavItem,
  NavLink,
} from "@/types/content";

/**
 * Product families as a single titled column.
 *
 * Deliberately not split across two columns. Splitting leaves the second column
 * without a heading, so its first item sits higher than the first column's and
 * the two lists read as misaligned. `MegaMenu` flows a long single column into
 * a responsive grid instead, which stays aligned at any number of families.
 */
function productColumns(categories: Category[]): NavColumn[] {
  const links: NavLink[] = categories.map((category) => ({
    label: category.name,
    href: `/products/${category.slug}`,
    description: category.summary,
  }));

  return [{ title: "Product families", links }];
}

/** Applications grouped by the industry they belong to. */
function applicationColumns(
  applications: Application[],
  industries: Industry[],
): NavColumn[] {
  return industries.map((industry) => ({
    title: industry.name,
    /*
     * The heading was already the industry's name; this makes it its link.
     *
     * Nothing about the grouping changes — the column still lists the
     * applications whose `groupSlug` matches, which is the relationship
     * Cerium's material declares. The industry page is simply now reachable
     * from the navigation that was already naming it.
     */
    titleHref: `/industries/${industry.slug}`,
    links: applications
      .filter((application) => application.groupSlug === industry.slug)
      .map((application) => ({
        label: application.name,
        href: `/applications/${application.slug}`,
        description: application.description,
      })),
  }));
}

export function buildPrimaryNavigation(
  categories: Category[],
  applications: Application[],
  industries: Industry[],
): NavItem[] {
  return [
    {
      label: "Products",
      href: "/products",
      columns: productColumns(categories),
      feature: {
        eyebrow: "2026 Catalogue",
        // Deliberately not a number: the derived product count is shown on the
        // products page itself, so the two can never disagree.
        title: "The full Cerium range",
        body: "Browse every cosmetic and personal care ingredient Cerium supplies, by material type.",
        href: "/products",
        linkLabel: "View all products",
      },
    },
    {
      label: "Applications",
      href: "/applications",
      columns: applicationColumns(applications, industries),
      feature: {
        eyebrow: "Formulating",
        title: "Find ingredients by end use",
        body: "Start from the product you are formulating and work back to the materials that deliver it.",
        href: "/applications",
        linkLabel: "Explore applications",
      },
    },
    {
      label: "Industries",
      href: "/industries",
      columns: [
        {
          title: "Markets we serve",
          links: industries.map((industry) => ({
            label: industry.name,
            href: `/industries/${industry.slug}`,
            description: industry.description,
          })),
        },
      ],
    },
    {
      label: "About",
      href: "/about",
      columns: [
        {
          title: "Company",
          links: [
            {
              label: "About Cerium",
              href: "/about",
              description: "Who we are and how we work.",
            },
            {
              label: "Vision & mission",
              href: "/about#vision",
              description: "Where we are going and why.",
            },
            {
              label: "Core values",
              href: "/about#values",
              description: "The six values we operate by.",
            },
            {
              label: "Partners",
              href: "/about#partners",
              description: "The global suppliers we work with.",
            },
          ],
        },
      ],
    },
  ];
}

/** Footer link groups. Kept separate — a footer is not a shrunken header. */
export function buildFooterNavigation(
  categories: Category[],
  applications: Application[],
  industries: Industry[],
): NavColumn[] {
  return [
    {
      title: "Company",
      links: [
        { label: "About Cerium", href: "/about" },
        { label: "Vision & mission", href: "/about#vision" },
        { label: "Core values", href: "/about#values" },
        { label: "Partners", href: "/about#partners" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Products",
      links: [
        { label: "All products", href: "/products" },
        ...categories.map((category) => ({
          label: category.name,
          href: `/products/${category.slug}`,
        })),
      ],
    },
    {
      title: "Applications",
      links: [
        { label: "All applications", href: "/applications" },
        ...applications.map((application) => ({
          label: application.name,
          href: `/applications/${application.slug}`,
        })),
      ],
    },
    {
      title: "Resources",
      links: [
        /*
         * The two industries are listed individually, not just their index.
         *
         * The mega-menu names each industry as a column heading and now links
         * it — but that panel is UNMOUNTED while closed, so none of it exists
         * in the served HTML and no crawler ever sees it. The reason
         * application pages already had ~160 inbound chrome links is this
         * footer, which lists all six of them; industries had none because
         * only their index was here.
         *
         * Listing them makes the footer the crawlable route it already was for
         * applications. No relationship is created: both pages exist, and
         * /industries already links to them.
         */
        { label: "Industries", href: "/industries" },
        ...industries.map((industry) => ({
          label: industry.name,
          href: `/industries/${industry.slug}`,
        })),
        /*
         * The only real <a> pointing at /search anywhere on the site.
         *
         * The header trigger is a <button> that opens the overlay, so before
         * this link existed a visitor without JavaScript had no route to the
         * search page at all — the GET form degrades correctly, but nothing
         * could reach the form. This is the progressive-enhancement floor:
         * pointer users still get the overlay, everyone else gets a page.
         *
         * /search stays noindex; this makes it reachable, not indexable.
         */
        { label: "Search the catalogue", href: "/search" },
        { label: "Make an enquiry", href: "/contact" },
        // Planned destinations. Rendered as non-interactive until they exist.
        { label: "Product catalogue", href: "/resources", upcoming: true },
        { label: "Technical documents", href: "/resources", upcoming: true },
        { label: "Insights", href: "/insights", upcoming: true },
      ],
    },
  ];
}

/**
 * The browse fallback shown inside the search overlay.
 *
 * Deliberately tiny: top-level families and applications only, label and href.
 * `SearchOverlay` is a client component, and this is the entire catalogue-shaped
 * payload it needs — roughly a dozen links rather than the whole tree it used
 * to import to render exactly this.
 */
export function buildBrowseLists(
  categories: Category[],
  applications: Application[],
): BrowseLists {
  return {
    families: categories.map((category) => ({
      label: category.name,
      href: `/products/${category.slug}`,
    })),
    applications: applications.map((application) => ({
      label: application.name,
      href: `/applications/${application.slug}`,
    })),
  };
}

/** Legal links. Rendered as non-interactive until the pages are written. */
export const legalNavigation: NavLink[] = [
  { label: "Privacy policy", href: "/privacy", upcoming: true },
  { label: "Terms of use", href: "/terms", upcoming: true },
];
