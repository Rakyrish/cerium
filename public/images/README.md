# Site images

Drop image files in this folder, then reference them from the data layer as
`/images/<filename>`. Everything under `public/` is served from the site root,
so `public/images/hero.jpg` is `/images/hero.jpg`.

## Where to reference them

| Image | Edit this file |
|---|---|
| Hero, company intro, about portrait | `src/data/media.ts` |
| Product family / range images | `src/data/taxonomy.ts` |
| Application images (Skin Care, Fabric Care…) | `src/data/applications.ts` |
| Industry images (Personal Care, Home Care) | `src/data/applications.ts` |
| Individual product images | `src/data/taxonomy.ts` |

No component needs to be edited. A slot with no image keeps rendering the
labelled "Image pending" placeholder.

## The shape

```ts
image: {
  src: "/images/natural-extracts.jpg",
  alt: "Botanical extracts in amber glass bottles",
  focal: "center 30%",   // optional — see below
}
```

`alt` describes what is in the picture and why it matters. Use `alt: ""` only
for purely decorative images. Never write "image of…".

`focal` is optional and takes a CSS `object-position` value. Use it when a crop
cuts off the important part — e.g. `"center 25%"` keeps the top third in frame.

## Naming

Lowercase, hyphenated, descriptive: `carrier-oils-decanting.jpg`, not
`IMG_4821.JPG`. The filename is not the alt text, but a clear name makes the
data files readable.

## Sizes and formats

Images are resized and converted automatically, so upload the **largest good
version you have** — do not pre-shrink them.

| Slot | Shape | Recommended width |
|---|---|---|
| Hero | Landscape | 2400px+ |
| Category / application tiles | Portrait 3:4 | 1200px+ |
| Company / about portraits | Portrait 3:4 | 1200px+ |
| Product images | Square | 800px+ |

Use JPEG for photographs and PNG only when transparency is needed. Next.js
serves AVIF/WebP to browsers that support them.

**Keep source files under ~2MB each.** If a photo is larger, it is almost
certainly bigger than it needs to be.

## One rule

Only put real Cerium imagery here. Do not add stock photography that implies it
shows Cerium's own products, facilities, team or customers — a placeholder is
honest, a misleading photo is not.

## Moving to Cloudinary later

When Cloudinary is set up, set `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` and swap
`src` for `cloudinaryId` in the same entries. Nothing else changes.
