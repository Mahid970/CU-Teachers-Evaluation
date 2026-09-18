import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cu.ac.bd", pathname: "/assets/image/**" }],
  },
  async headers() {
    return [
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
    ];
  },
};

// Makes D1/KV bindings available while running `next dev`.
initOpenNextCloudflareForDev();

export default nextConfig;
