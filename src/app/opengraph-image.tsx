import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { siteConfig } from "@/config/site";

/**
 * Default social share image, used whenever a page doesn't define its own.
 *
 * Node runtime (not edge) because this is a standalone Docker/Node
 * deployment, not an edge deployment target — no edge fs restrictions to
 * work around.
 */
export const runtime = "nodejs";
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logoData = await readFile(
    join(process.cwd(), "public", siteConfig.brand.logoInverse.src),
  );
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          backgroundColor: siteConfig.brand.themeColor,
        }}
      >
        <img src={logoSrc} width={440} height={137.5} alt="" />
        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: siteConfig.brand.onDarkColor,
            letterSpacing: 0.5,
            textAlign: "center",
            maxWidth: 860,
          }}
        >
          {siteConfig.strapline}
        </div>
      </div>
    ),
    { ...size },
  );
}
