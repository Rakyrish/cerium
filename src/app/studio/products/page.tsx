import { categories } from "@/data/taxonomy";
import { AddProductForm } from "@/components/studio/AddProductForm";
import { categoryOptions } from "@/app/studio/page";

export const dynamic = "force-dynamic";

export default function StudioProductsPage() {
  return (
    <div>
      <h2 className="text-h3 font-semibold">Add a product</h2>
      <p className="mt-2 max-w-[70ch] text-small text-text-muted">
        Adding a product to a range that has no page yet will publish that page
        automatically.
      </p>

      <div className="mt-8">
        <AddProductForm options={categoryOptions(categories)} />
      </div>
    </div>
  );
}
