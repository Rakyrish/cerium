import { ImageManager } from "@/components/studio/ImageManager";
import { listImages } from "@/lib/studio-images";

export const dynamic = "force-dynamic";

export default async function StudioImagesPage() {
  const files = await listImages();

  return (
    <div>
      <h2 className="text-h3 font-semibold">Images</h2>
      <p className="mt-2 max-w-[70ch] text-small text-text-muted">
        Files here live in <code className="font-mono text-text">public/images/</code>.
        Copy a path and paste it into a range or product in the Studio, or into{" "}
        <code className="font-mono text-text">src/data/media.ts</code> for the
        hero and page imagery.
      </p>

      <div className="mt-8">
        <ImageManager files={files} />
      </div>
    </div>
  );
}
