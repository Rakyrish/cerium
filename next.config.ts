import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";
import { config as loadEnv } from "dotenv";

/**
 * Load the project's single configuration file.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS HERE AND NOT IN A .env NEXT WOULD FIND ON ITS OWN
 * ---------------------------------------------------------------------------
 * There is one .env for the whole project, at the repository root, shared with
 * the Django backend. Next only looks for .env files inside this directory, so
 * without this it would find nothing and every NEXT_PUBLIC_ value would be
 * inlined as `undefined` — a build that succeeds and produces a broken site.
 *
 * `next.config.ts` is evaluated before compilation begins, which is what makes
 * this early enough for the NEXT_PUBLIC_ replacement to see the values.
 *
 * `override: false` is deliberate: a variable already present in the real
 * environment wins. That is what lets docker-compose pass build args and CI
 * pass secrets without either being silently overwritten by a stale local file.
 */
const rootEnv = path.resolve(__dirname, "..", ".env");
if (existsSync(rootEnv)) {
  loadEnv({ path: rootEnv, override: false });
}

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Emits a self-contained .next/standalone build (minimal node_modules
  // subset + server.js) so the production Docker image doesn't need to ship
  // the full node_modules tree.
  output: "standalone",

  // Do not leak the framework version in response headers.
  poweredByHeader: false,

  images: {
    // Modern formats first; Next falls back automatically for older browsers.
    formats: ["image/avif", "image/webp"],
    /**
     * Cloudinary is the only permitted remote image host.
     *
     * `CeriumImage` uses a custom Cloudinary loader, which bypasses the Next
     * optimizer — but this allowlist is still declared so that any future use
     * of a plain remote <Image src> cannot silently pull from an arbitrary
     * origin.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },

  /**
   * Security headers.
   *
   * Baseline only — a full policy (including a Content-Security-Policy with a
   * nonce, and HSTS) is set at the reverse proxy during production hardening in
   * Phase 14. CSP is intentionally not added here: a wrong CSP silently breaks
   * pages, and it needs to be written against the real deployed origin set.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
