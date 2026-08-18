/**
 * Navigation architecture.
 *
 * Derived from the taxonomy rather than written out by hand, so adding a
 * product family in `taxonomy.ts` updates the desktop mega-menu, the mobile
 * drawer and the footer at once. No navigation component contains a hardcoded
 * category.
 *
 * `upcoming: true` marks a destination that is planned but not yet built. The
 * UI renders those as non-interactive so a visitor is never sent to a dead end.
 */

import type { NavColumn, NavItem, NavLink } from "@/types/content";
import { categories } from "@/data/taxonomy";
import { applications, industries } from "@/data/applications";

/**
 * Product families as a single titled column.
 *
 * Deliberately not split across two columns. Splitting leaves the second column
 * without a heading, so its first item sits higher than the first column's and
 * the two lists read as misaligned. `MegaMenu` flows a long single column into
 * a responsive grid instead, which stays aligned at any number of families.
 */
function productColumns(): NavColumn[] {
  const links: NavLink[] = categories.map((category) => ({
    label: category.name,
    href: `/products/${category.slug}`,
    description: category.summary,
  }));

  return [{ title: "Product families", links }];
}

/** Applications grouped by the industry they belong to. */
function applicationColumns(): NavColumn[] {
  return industries.map((industry) => ({
    title: industry.name,
    links: applications
      .filter((application) => application.groupSlug === industry.slug)
      .map((application) => ({
        label: application.name,
        href: `/applications/${application.slug}`,
        description: application.description,
      })),
  }));
}

export const primaryNavigation: NavItem[] = [
  {
    label: "Products",
    href: "/products",
    columns: productColumns(),
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
    columns: applicationColumns(),
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

/** Footer link groups. Kept separate — a footer is not a shrunken header. */
export const footerNavigation: NavColumn[] = [
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
      { label: "Industries", href: "/industries" },
      { label: "Make an enquiry", href: "/contact" },
      // Planned destinations. Rendered as non-interactive until they exist.
      { label: "Product catalogue", href: "/resources", upcoming: true },
      { label: "Technical documents", href: "/resources", upcoming: true },
      { label: "Insights", href: "/insights", upcoming: true },
    ],
  },
];

/** Legal links. Rendered as non-interactive until the pages are written. */
export const legalNavigation: NavLink[] = [
  { label: "Privacy policy", href: "/privacy", upcoming: true },
  { label: "Terms of use", href: "/terms", upcoming: true },
];
