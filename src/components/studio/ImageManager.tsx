"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StoredImage } from "@/lib/studio-images";
import { Notice } from "@/components/studio/fields";

/**
 * Image library.
 *
 * Uploads into `public/images/` and lists what is already there, with the path
 * to paste into a data file. Copying the path is the common case, so it is a
 * one-click action rather than something to select by hand.
 *
 * The file list is read on the server and passed in, so there is no fetch on
 * mount and nothing to wait for. After an upload, `router.refresh()` re-runs the
 * server read — one source of truth for what is on disk.
 */
export function ImageManager({ files }: { files: StoredImage[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function upload(fileList: FileList) {
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(fileList)) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/studio/upload", { method: "POST", body });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(`${file.name}: ${data.error ?? "upload failed"}`);
        }
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function copy(src: string) {
    await navigator.clipboard.writeText(src);
    setCopied(src);
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <label
          htmlFor="studio-upload"
          className="text-small font-medium text-text"
        >
          Upload images
        </label>
        <input
          id="studio-upload"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
          disabled={uploading}
          onChange={(event) => {
            if (event.target.files?.length) void upload(event.target.files);
          }}
          className="mt-2 block w-full max-w-lg text-small text-text-muted file:mr-3 file:rounded-sm file:border file:border-border file:bg-surface file:px-4 file:py-2 file:text-small file:font-medium file:text-text hover:file:border-primary"
        />
        <p className="mt-2 text-caption text-text-muted">
          JPG, PNG, WebP, AVIF or SVG. Max 8MB each. Filenames are cleaned up
          automatically; an existing file is never overwritten.
        </p>
      </div>

      {uploading && <p className="text-small text-text-muted">Uploading…</p>}
      {error && <Notice tone="error">{error}</Notice>}

      <section>
        <h3 className="text-h4 font-semibold">
          In public/images {files.length > 0 && `(${files.length})`}
        </h3>

        {files.length === 0 ? (
          <p className="mt-3 text-small text-text-muted">
            No images yet. Uploads appear here and can be referenced from{" "}
            <code className="font-mono text-text">src/data/</code>.
          </p>
        ) : (
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => (
              <li
                key={file.src}
                className="flex flex-col overflow-hidden rounded-sm border border-border bg-surface"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- library
                    preview of arbitrary local files. */}
                <img
                  src={file.src}
                  alt=""
                  className="h-40 w-full bg-surface-sunken object-cover"
                />
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <p className="truncate text-small font-medium" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-caption text-text-muted">
                    {(file.bytes / 1024).toFixed(0)} KB
                  </p>
                  <button
                    type="button"
                    onClick={() => void copy(file.src)}
                    className="mt-auto self-start text-small font-medium text-primary underline underline-offset-4"
                  >
                    {copied === file.src ? "Copied" : "Copy path"}
                    <span className="sr-only"> for {file.name}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
