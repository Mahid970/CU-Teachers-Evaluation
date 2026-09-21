import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cu.ac.bd", pathname: "/assets/image/**" }],
  },
  async headers() {
    // Where two rules set the same header, the LAST match wins — so the broad
    // rule goes first and anything more specific overrides it below.
    return [
      {
        /**
         * Pages must be revalidated, never reused from a previous deploy.
         *
         * Next emits `s-maxage=…, stale-while-revalidate=2592000` and no
         * `max-age`, which leaves a browser free to reuse a page it fetched
         * weeks ago. That page asks for the script and style files of the
         * build it came from, and a deploy has since replaced them — so it
         * loads with no JavaScript at all and every button on it is dead,
         * with nothing on screen to say why.
         *
         * This costs one conditional request per visit, usually answered with
         * a 304. It does not touch the Worker's own cache, which is where the
         * speed actually comes from.
         *
         * Hashed build output is not covered here: it never reaches the Next
         * server at all. Its caching is set in `public/_headers`.
         */
        source: "/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      {
        source: "/:path*",
        headers: [
          // No referrers leave the site, and nothing here may be framed.
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
      {
        // Nothing an API returns should be held anywhere. Last, so it wins.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

// Makes D1/KV bindings available while running `next dev`.
initOpenNextCloudflareForDev();

export default nextConfig;
