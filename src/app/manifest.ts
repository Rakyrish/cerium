import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#21683f",
    /*
     * The Cerium "C" monogram, cropped from the supplied logo lockup.
     *
     * The full lockup is 3.2:1 — at 32px the wordmark and "Sourcing made easy"
     * strapline render as an illegible smear, so the icon uses the monogram
     * alone, which is the part of the mark that survives at tab size.
     *
     * It sits on a white ground rather than transparency because the mark is
     * the logo's pure #0000FF: against a dark browser tab bar that is roughly
     * 2:1 contrast and effectively disappears. White keeps it legible in both
     * light and dark themes.
     */
    icons: [
      { src: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { src: "/icon.png", sizes: "256x256", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
