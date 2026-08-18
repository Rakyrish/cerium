/**
 * Slug utilities.
 *
 * Public URLs must use meaningful slugs, never numeric IDs.
 *
 * Phase 1 derives product slugs deterministically from product names so the
 * local data stays maintainable. From Phase 2 slugs become persisted database
 * fields, which decouples the URL from the display name and keeps links stable
 * if a product is ever renamed. Category slugs are already written explicitly
 * for that reason — they are the URLs most likely to be indexed and linked.
 */

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    // strip diacritics
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    // ampersand reads better as a word than as a dropped character
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
