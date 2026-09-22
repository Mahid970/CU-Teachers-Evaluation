import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import { fromBase64, reviewHash, verifyToken } from "@/lib/blind";
import { todayIso } from "@/lib/server-crypto";
import { MAX_REVIEW_LENGTH } from "@/lib/rating";
import { rateLimit } from "@/lib/guard";

export const dynamic = "force-dynamic";

/**
 * A written review, deliberately kept apart from the scores it came with.
 *
 * The same token proves the right to write this as proves the right to rate,
 * but the row is filed under a different hash of it and arrives in its own
 * request. Nothing in the database connects a review to a rating, so nobody
 * reading it — including whoever runs this site — can put a sentence next to
 * the number that came with it.
 *
 * Like `/api/rate`, there is no sign-in here. The token is the only proof.
 */

const ReviewSchema = z.object({
  teacherId: z.string().min(1).max(32),
  prepared: z.string().min(1).max(2048),
  signature: z.string().min(1).max(2048),
  body: z.string().max(MAX_REVIEW_LENGTH),
});

/**
 * Collapses runs of whitespace and strips anything that is not printable.
 *
 * Invisible characters are worth removing on their own account: zero-width
 * marks are the classic way to fingerprint a piece of text so its author can be
 * recognised later.
 */
function tidy(body: string): string {
  return body
    .replace(/[​-‏‪-‮⁠-⁯﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB;

  if (!(await rateLimit(request, "review", 600)).ok) {
    return Response.json(
      { error: "Too many reviews from this connection. Please try again later." },
      { status: 429 },
    );
  }

  const parsed = ReviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "That review was not in the expected shape." }, { status: 400 });
  }
  const { teacherId, prepared, signature } = parsed.data;
  const body = tidy(parsed.data.body);

  const term = await db
    .prepare(`SELECT id FROM terms WHERE is_open = 1 ORDER BY opens_at DESC LIMIT 1`)
    .first<{ id: string }>();
  if (!term) {
    return Response.json({ error: "Rating is closed at the moment." }, { status: 503 });
  }

  const keyRow = await db
    .prepare(`SELECT public_key FROM teacher_term_keys WHERE teacher_id = ?1 AND term_id = ?2`)
    .bind(teacherId, term.id)
    .first<{ public_key: string }>();
  if (!keyRow) {
    return Response.json({ error: "That teacher cannot be rated." }, { status: 404 });
  }

  const valid = await verifyToken(
    JSON.parse(keyRow.public_key) as JsonWebKey,
    fromBase64(prepared),
    fromBase64(signature),
  );
  if (!valid) {
    return Response.json(
      { error: "This rating token is not valid for this teacher." },
      { status: 403 },
    );
  }

  const hash = await reviewHash(fromBase64(prepared), fromBase64(signature));

  // An empty body is how a student deletes what they wrote.
  if (body.length === 0) {
    await db.prepare(`DELETE FROM reviews WHERE review_hash = ?1`).bind(hash).run();
    return Response.json({ ok: true, removed: true });
  }

  await db
    .prepare(
      `INSERT INTO reviews (review_hash, teacher_id, term_id, body, hidden, written_on)
       VALUES (?1, ?2, ?3, ?4, 0, ?5)
       ON CONFLICT(review_hash) DO UPDATE SET
         body = excluded.body,
         written_on = excluded.written_on`,
    )
    .bind(hash, teacherId, term.id, body, todayIso())
    .run();

  return Response.json({ ok: true, note: "Your review is now on the teacher\u2019s page." });
}
