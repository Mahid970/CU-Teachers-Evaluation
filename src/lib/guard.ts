import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Abuse controls that keep no identifying trail.
 *
 * Rate limiting uses a counter in KV keyed by a *truncated* hash of the client
 * IP plus the day. The IP itself is never written down, the key cannot be
 * reversed to one address (the truncation makes many addresses share a key),
 * and the entry expires within the hour.
 */

export async function rateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowSeconds = 3600,
): Promise<{ ok: boolean }> {
  const { env } = await getCloudflareContext({ async: true });
  const kv = env.RATE_LIMIT;
  if (!kv) return { ok: true };

  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const day = new Date().toISOString().slice(0, 10);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${bucket}:${ip}:${day}`) as Uint8Array<ArrayBuffer>,
  );
  // 8 hex characters only: enough to spread traffic, far too coarse to single
  // out one person.
  const short = Array.from(new Uint8Array(digest).slice(0, 4))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const key = `rl:${bucket}:${short}`;

  const current = Number((await kv.get(key)) ?? 0);
  if (current >= limit) return { ok: false };
  await kv.put(key, String(current + 1), { expirationTtl: windowSeconds });
  return { ok: true };
}

/**
 * Cloudflare Turnstile, active only when a secret is configured. It is a
 * privacy-friendly challenge: no cookies, no cross-site tracking.
 */
export async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  const { env } = await getCloudflareContext({ async: true });
  const secret = env.TURNSTILE_SECRET;
  if (!secret) return true; // not configured: nothing to check
  if (!token) return false;

  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body },
    );
    const result = (await response.json()) as { success: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
