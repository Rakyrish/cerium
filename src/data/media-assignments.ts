/**
 * Media assignments — which picture belongs to which thing.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS NOT PART OF `catalogue.overrides.json`
 * ---------------------------------------------------------------------------
 * `applyOverrides` deliberately refuses to touch anything that already exists:
 * a category whose slug is already present is skipped (`overrides.ts`), and so
 * is a product already declared in its range. That guarantee is what protects
 * the reviewed catalogue from being quietly rewritten by a form, and it is
 * worth keeping exactly as strict as it is.
 *
 * The consequence was that there was NO WAY to attach a photograph to any of
 * the 122 reviewed products or 30 reviewed categories. The only remaining route
 * was hand-editing `taxonomy.ts`, which is reviewed code the Studio must never
 * write to. So the images could not be added at all.
 *
 * This file resolves that without weakening anything, by separating two things
 * that were being treated as one:
 *
 *   - CONTENT is a claim about a material — its name, its benefit copy, the
 *     document that claim came from. Shadowing that corrupts provenance, which
 *     for a chemicals supplier is a safety matter. Still forbidden.
 *
 *   - MEDIA is presentation. A photograph attached to "Aloe Vera Extract"
 *     asserts nothing about the chemistry, changes no technical value, and
 *     carries no provenance obligation of the same kind.
 *
 * So media gets its own layer with its own rule: it MAY attach to existing
 * records, because attaching a picture is not editing the catalogue. Nothing
 * here can add, rename, reword or re-source a product — the shape simply has
 * nowhere to put such a change.
 *
 * ---------------------------------------------------------------------------
 * THE STORAGE SEAM
 * ---------------------------------------------------------------------------
 * Assignments live in a JSON file that the Content Studio writes in
 * development and that is bundled at build time, which is the correct Phase 1
 * answer for a statically generated site. When the catalogue moves to Django,
 * only the two loaders below change: the merge functions, the components and
 * the Studio UI all consume the same shape. See `lib/content.ts` for the same
 * pattern applied to catalogue records.
 */

import type { Category, ImageRef } from "@/types/content";
import assignmentsData from "@/data/media.assignments.json";

/**
 * The editorial image slots that are not attached to a catalogue record.
 *
 * Keyed rather than free-form: a slot is a designed position in a layout, so a
 * typo should fail to resolve rather than silently create a slot nothing
 * renders. Mirrors the keys of `siteMedia` in `media.ts`.
 */
export type SiteImageSlot = "hero" | "companyIntro" | "aboutPortrait";

export interface MediaAssignments {
  /** Editorial slots — hero, homepage portrait, about portrait. */
  site: Partial<Record<SiteImageSlot, ImageRef>>;
  /** Keyed by category slug. */
  categories: Record<string, ImageRef>;
  /** Keyed by product slug, which is unique across the whole catalogue. */
  products: Record<string, ImageRef>;
}

function normalise(data: Partial<MediaAssignments> | undefined): MediaAssignments {
  return {
    site: data?.site ?? {},
    categories: data?.categories ?? {},
    products: data?.products ?? {},
  };
}

export const mediaAssignments: MediaAssignments = normalise(
  assignmentsData as Partial<MediaAssignments>,
);

/** The image assigned to an editorial slot, if one has been chosen. */
export function siteImage(
  slot: SiteImageSlot,
  data: MediaAssignments = mediaAssignments,
): ImageRef | undefined {
  return data.site[slot];
}

/**
 * Attach assigned images to a catalogue tree.
 *
 * An image already present on a record wins. That keeps the direction of
 * authority pointing the same way as everywhere else in the data layer —
 * reviewed content in `taxonomy.ts` is the source of truth, and this layer only
 * fills a slot that is empty. It cannot replace a picture someone deliberately
 * committed alongside the reviewed data.
 *
 * Products are matched on slug alone because product slugs are unique across
 * the entire catalogue (verified: 122 products, 122 distinct slugs). If that
 * ever stops being true the route structure breaks first, so this is not the
 * assumption that will fail quietly.
 */
export function applyMediaAssignments(
  nodes: Category[],
  data: MediaAssignments = mediaAssignments,
): Category[] {
  return nodes.map((node) => ({
    ...node,
    image: node.image ?? data.categories[node.slug],
    products: node.products?.map((product) => ({
      ...product,
      image: product.image ?? data.products[product.slug],
    })),
    children: node.children
      ? applyMediaAssignments(node.children, data)
      : undefined,
  }));
}
