import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ImageRef } from "@/types/content";
import type { MediaAssignments, SiteImageSlot } from "@/data/media-assignments";
import { isStudioEnabled, studioDisabledResponse } from "@/lib/studio-guard";
import { listImages } from "@/lib/studio-images";

/**
 * Media assignment persistence.
 *
 * Reads and writes `src/data/media.assignments.json`. Development only — see
 * `lib/studio-guard.ts`.
 *
 * Like the catalogue handler, the request body is never spread into the stored
 * object: every field is validated and the record is rebuilt by hand, so an
 * unexpected key cannot reach the data file.
 */

const ASSIGNMENTS_PATH = path.join(
  process.cwd(),
  "src",
  "data",
  "media.assignments.json",
);

const SITE_SLOTS: ReadonlyArray<SiteImageSlot> = [
  "hero",
  "companyIntro",
  "aboutPortrait",
];

async function read(): Promise<MediaAssignments> {
  const raw = await readFile(ASSIGNMENTS_PATH, "utf8");
  const parsed = JSON.parse(raw) as Partial<MediaAssignments>;
  return {
    site: parsed.site ?? {},
    categories: parsed.categories ?? {},
    products: parsed.products ?? {},
  };
}

async function write(data: MediaAssignments): Promise<void> {
  await writeFile(ASSIGNMENTS_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : undefined;
}

type Scope = "site" | "category" | "product";

function isScope(value: unknown): value is Scope {
  return value === "site" || value === "category" || value === "product";
}

export async function GET() {
  if (!isStudioEnabled) return studioDisabledResponse();
  return Response.json(await read());
}

export async function POST(request: Request) {
  if (!isStudioEnabled) return studioDisabledResponse();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const scope = body.scope;
  if (!isScope(scope)) {
    return Response.json(
      { error: 'scope must be "site", "category" or "product".' },
      { status: 400 },
    );
  }

  const key = text(body.key);
  if (!key) {
    return Response.json(
      { error: "A slot or slug is required." },
      { status: 400 },
    );
  }

  if (scope === "site" && !SITE_SLOTS.includes(key as SiteImageSlot)) {
    return Response.json(
      { error: `Unknown site slot "${key}".` },
      { status: 400 },
    );
  }

  const src = text(body.src);
  if (!src) {
    return Response.json({ error: "Choose an image." }, { status: 400 });
  }

  /*
   * The path must name a file that is actually in the library.
   *
   * This handler writes a value that later becomes an `<img src>` on a public
   * page, so accepting an arbitrary caller-supplied string would let the form
   * point the site at any URL — including an off-site one. Checking against the
   * real directory listing means only something already uploaded through the
   * upload handler (which does its own type and size validation) can be
   * assigned.
   */
  const library = await listImages();
  if (!library.some((file) => file.src === src)) {
    return Response.json(
      { error: "That image is not in public/images/. Upload it first." },
      { status: 400 },
    );
  }

  /*
   * Alt text is required unless the image is explicitly marked decorative.
   *
   * `alt=""` is the correct markup for an image that carries no information —
   * the hero backdrop sits behind its own headline — but it is only correct
   * when someone has decided it. Defaulting to empty would silently ship
   * unlabelled content images, so the decision is a separate, deliberate flag
   * rather than the consequence of leaving a field blank.
   */
  const decorative = body.decorative === true;
  const alt = text(body.alt);

  if (!decorative && !alt) {
    return Response.json(
      {
        error:
          "Describe what the image shows, or mark it decorative if it carries no information.",
      },
      { status: 400 },
    );
  }

  const image: ImageRef = { src, alt: decorative ? "" : (alt as string) };

  const data = await read();

  if (scope === "site") {
    data.site = { ...data.site, [key as SiteImageSlot]: image };
  } else if (scope === "category") {
    data.categories = { ...data.categories, [key]: image };
  } else {
    data.products = { ...data.products, [key]: image };
  }

  await write(data);
  return Response.json({ ok: true, scope, key, image });
}

export async function DELETE(request: Request) {
  if (!isStudioEnabled) return studioDisabledResponse();

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");
  const key = searchParams.get("key");

  if (!isScope(scope) || !key) {
    return Response.json(
      { error: "scope and key are required." },
      { status: 400 },
    );
  }

  const data = await read();

  if (scope === "site") {
    data.site = without(data.site, key);
  } else if (scope === "category") {
    data.categories = without(data.categories, key);
  } else {
    data.products = without(data.products, key);
  }

  await write(data);
  return Response.json({ ok: true });
}

/** Copy without one key. Rebuilding beats mutating a parsed JSON object. */
function without<T extends object>(source: T, key: string): T {
  return Object.fromEntries(
    Object.entries(source).filter(([entry]) => entry !== key),
  ) as T;
}
