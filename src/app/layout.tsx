import type { Metadata, Viewport } from "next";
import { Inter_Tight, Newsreader } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { siteConfig } from "@/config/site";
import { fetchBrowseLists, fetchPrimaryNavigation } from "@/lib/content";
import { jsonLd, organizationSchema, websiteSchema } from "@/lib/seo";
import "./globals.css";

/**
 * Typeface strategy — two families, each with a job.
 *
 * Inter Tight carries all interface and body text: it is a variable font with
 * tight, even spacing that holds up in navigation, dense product listings and
 * on small screens.
 *
 * Newsreader is reserved for display and major statements only. The serif is
 * what keeps the site from reading as generic SaaS, and restricting it to large
 * sizes is what keeps it from reading as decoration.
 *
 * Both are variable and self-hosted by next/font, so there is one file per
 * family, no render-blocking request to Google, and no layout shift on swap.
 */
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — Specialty raw materials for personal care and home care`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    url: siteConfig.url,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  formatDetection: { telephone: true, address: false, email: true },
};

export const viewport: Viewport = {
  themeColor: "#21683f",
  width: "device-width",
  initialScale: 1,
  // Never block zoom — pinch-zoom is an accessibility requirement, not a
  // styling inconvenience.
  maximumScale: 5,
};

/**
 * Root layout.
 *
 * Async because navigation is resolved here, on the server, and passed into the
 * header as props. `Header` is a client component for interaction reasons only;
 * resolving its data up here is what keeps the catalogue out of the client
 * bundle, and it is also the shape the Phase 2 API needs — a client component
 * cannot await a module-scope import.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [navigation, browse] = await Promise.all([
    fetchPrimaryNavigation(),
    fetchBrowseLists(),
  ]);

  return (
    <html
      lang={siteConfig.language}
      className={`${interTight.variable} ${newsreader.variable}`}
    >
      <head>
        {/* Site-wide structured data. Page-level schema is added per route. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(websiteSchema()) }}
        />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <Header navigation={navigation} browse={browse} />
        {/* The skip link in Header targets this id. */}
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
