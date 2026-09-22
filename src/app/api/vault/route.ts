import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import { decryptJson, encryptJson, hmac, todayIso } from "@/lib/server-crypto";
import { rateLimit } from "@/lib/guard";

export const dynamic = "force-dynamic";

/**
 * The token vault: ciphertext in, ciphertext out.
 *
 * There is no sign-in here, and that is the point. The student's browser
 * derives `lookup` from their ID and their passphrase together and sends only
 * that, so this endpoint never sees a student ID — which means the server is
 * never in a position to record that a given vault belongs to a given person.
 *
 * What is stored is wrapped a second time under VAULT_PEPPER, a Workers secret
 * that is not in the database. A leaked copy of the database therefore offers
 * nothing to guess passphrases against: an attacker would need the secret too.
 *
 * Everything meaningful happens in the browser. This route cannot read a vault,
 * cannot open one, and cannot say whose it is.
 */

const MAX_CIPHERTEXT = 200_000;

const VaultSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"),
    // 64 hex characters: SHA-256 of a value derived from the passphrase.
    lookup: z.string().regex(/^[0-9a-f]{64}$/),
    term: z.string().min(1).max(32),
    ciphertext: z.string().min(1).max(MAX_CIPHERTEXT),
  }),
  z.object({
    action: z.literal("load"),
    lookup: z.string().regex(/^[0-9a-f]{64}$/),
  }),
]);

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });

  // Tighter than the other endpoints: fetching vaults is the one way to guess
  // at a lookup, and a real student needs a handful of calls a term.
  if (!(await rateLimit(request, "vault", 120)).ok) {
    return Response.json(
      { error: "Too many vault requests from this connection. Try again later." },
      { status: 429 },
    );
  }

  if (!env.VAULT_PEPPER) {
    return Response.json({ error: "The vault is not configured." }, { status: 503 });
  }

  const parsed = VaultSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "That request was not in the expected shape." }, { status: 400 });
  }

  const key = await hmac(env.VAULT_PEPPER, parsed.data.lookup);

  if (parsed.data.action === "load") {
    const row = await env.DB.prepare(`SELECT ciphertext FROM vaults WHERE lookup = ?1`)
      .bind(key)
      .first<{ ciphertext: string }>();
    if (!row) return Response.json({ ciphertext: null });
    return Response.json({
      ciphertext: await decryptJson<string>(env.VAULT_PEPPER, row.ciphertext),
    });
  }

  const term = await env.DB.prepare(
    `SELECT id FROM terms WHERE is_open = 1 ORDER BY opens_at DESC LIMIT 1`,
  ).first<{ id: string }>();
  if (!term || term.id !== parsed.data.term) {
    return Response.json({ error: "Rating is not open right now." }, { status: 409 });
  }

  await env.DB.prepare(
    `INSERT INTO vaults (lookup, term_id, ciphertext, updated_on)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(lookup) DO UPDATE SET
       ciphertext = excluded.ciphertext,
       updated_on = excluded.updated_on`,
  )
    .bind(key, term.id, await encryptJson(env.VAULT_PEPPER, parsed.data.ciphertext), todayIso())
    .run();

  return Response.json({ ok: true });
}
