import {
  MediaAssigner,
  type AssignTarget,
} from "@/components/studio/MediaAssigner";
import { listImages } from "@/lib/studio-images";
import { mediaAssignments } from "@/data/media-assignments";
import { siteMedia } from "@/data/media";
import { fetchCategories, fetchAllProducts } from "@/lib/content";
import { flattenCategories, isPublishable } from "@/data/taxonomy";

/**
 * Media assignment.
 *
 * `force-dynamic` because the whole point is to reflect a JSON file and a
 * directory that change while the page is open. The assignments module is
 * bundled at build time, so the read below is deliberately of the module —
 * after a save, `router.refresh()` re-runs this server component and Next
 * re-reads it in dev, which is where this tool runs.
 */
export const dynamic = "force-dynamic";

export default async function StudioMediaPage() {
  const [library, categories, products] = await Promise.all([
    listImages(),
    fetchCategories(),
    fetchAllProducts(),
  ]);

  /*
   * Only the three fields the picker needs cross into the client component.
   * See the note at the top of `MediaAssigner`.
   */
  const site: AssignTarget[] = (
    [
      ["hero", "Homepage hero"],
      ["companyIntro", "Homepage — who we are"],
      ["aboutPortrait", "About page portrait"],
    ] as const
  ).map(([key, label]) => ({
    key,
    label,
    hint: siteMedia[key].placeholder,
    assigned: toAssigned(mediaAssignments.site[key]),
  }));

  const categoryTargets: AssignTarget[] = flattenCategories(categories)
    // A range with no page of its own has nowhere to show an image.
    .filter(isPublishable)
    .map((category) => ({
      key: category.slug,
      label: category.name,
      assigned: toAssigned(mediaAssignments.categories[category.slug]),
    }));

  const productTargets: AssignTarget[] = products.map((product) => ({
    key: product.slug,
    label: product.name,
    context: product.categoryName,
    assigned: toAssigned(mediaAssignments.products[product.slug]),
  }));

  return (
    <div>
      <h2 className="text-h3 font-semibold">Media</h2>
      <p className="mt-2 max-w-[72ch] text-small text-text-muted">
        Attach uploaded images to the site, to a product, or to a range. Upload
        the files on the Images tab first, then assign them here. Anything left
        unassigned keeps rendering the labelled “Image pending” placeholder,
        which is a safe state — nothing breaks either way.
      </p>

      <div className="mt-8">
        <MediaAssigner
          library={library}
          site={site}
          categories={categoryTargets}
          products={productTargets}
        />
      </div>
    </div>
  );
}

function toAssigned(
  image: { src?: string; alt?: string } | undefined,
): { src: string; alt: string } | undefined {
  if (!image?.src) return undefined;
  return { src: image.src, alt: image.alt ?? "" };
}
