import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import type { Category } from "@/types/content";
import type { CatalogueOverrides } from "@/data/overrides";
import { categories, countProducts, isPublishable } from "@/data/taxonomy";
import {
  AddCategoryForm,
  type CategoryOption,
} from "@/components/studio/AddCategoryForm";
import { OverridesList } from "@/components/studio/OverridesList";

// Always reflect what is on disk right now, not a cached render.
export const dynamic = "force-dynamic";

/** Flatten the tree into indented options for the parent selector. */
export function categoryOptions(nodes: Category[], depth = 0): CategoryOption[] {
  return nodes.flatMap((node) => [
    { slug: node.slug, name: node.name, depth },
    ...categoryOptions(node.children ?? [], depth + 1),
  ]);
}

async function readOverrides(): Promise<CatalogueOverrides> {
  const file = path.join(process.cwd(), "src", "data", "catalogue.overrides.json");
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as Partial<CatalogueOverrides>;
    return { categories: parsed.categories ?? [], products: parsed.products ?? [] };
  } catch {
    return { categories: [], products: [] };
  }
}

export default async function StudioPage() {
  const overrides = await readOverrides();
  const options = categoryOptions(categories);

  return (
    <div className="flex flex-col gap-14">
      <section>
        <h2 className="text-h3 font-semibold">Catalogue</h2>
        <p className="mt-2 max-w-[70ch] text-small text-text-muted">
          Every range currently on the site. A range only gets its own page once
          it has products or sub-ranges — that is why the Food Ingredients
          sub-ranges show as unpublished.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-small">
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="py-2 pr-4 font-semibold">Range</th>
                <th scope="col" className="py-2 pr-4 font-semibold">URL</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Products</th>
                <th scope="col" className="py-2 font-semibold">Page</th>
              </tr>
            </thead>
            <tbody>
              {categoryOptions(categories).map((option) => {
                const category = findBySlug(categories, option.slug);
                if (!category) return null;
                const count = countProducts(category);
                const published = isPublishable(category);

                return (
                  <tr key={option.slug} className="border-b border-border">
                    <td className="py-2.5 pr-4">
                      <span style={{ paddingLeft: `${option.depth * 1.25}rem` }}>
                        {option.name}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-caption text-text-muted">
                      /products/{option.slug}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">{count}</td>
                    <td className="py-2.5">
                      {published ? (
                        <Link
                          href={`/products/${option.slug}`}
                          className="text-primary underline underline-offset-4"
                        >
                          View
                        </Link>
                      ) : (
                        <span className="text-text-muted">Not published</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-h3 font-semibold">Added through the Studio</h2>
        <div className="mt-5">
          <OverridesList data={overrides} />
        </div>
      </section>

      <section>
        <h2 className="text-h3 font-semibold">Add a range</h2>
        <p className="mt-2 max-w-[70ch] text-small text-text-muted">
          Creates a new product family, or a sub-range inside an existing one.
        </p>
        <div className="mt-6">
          <AddCategoryForm options={options} />
        </div>
      </section>
    </div>
  );
}

function findBySlug(nodes: Category[], slug: string): Category | undefined {
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const found = node.children && findBySlug(node.children, slug);
    if (found) return found;
  }
  return undefined;
}
