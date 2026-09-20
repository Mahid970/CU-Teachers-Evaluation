import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

export default defineCloudflareConfig({
  // Rendered pages are cached in KV and served from the edge, so a visitor is
  // not waiting on database queries that produce the same page for everyone.
  // Each page's own `revalidate` decides how long an entry stays fresh.
  incrementalCache: kvIncrementalCache,
});
