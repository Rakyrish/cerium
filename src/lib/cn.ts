/**
 * Minimal className joiner.
 *
 * Deliberately not a dependency. `clsx`/`tailwind-merge` add weight for
 * behaviour this project does not need — component APIs here are closed enough
 * that conflicting utility classes are not a concern.
 */
export function cn(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}
