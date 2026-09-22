import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import { fromBase64, tokenHash, verifyToken } from "@/lib/blind";
import { todayIso } from "@/lib/server-crypto";
import { CRITERION_KEYS } from "@/lib/rating";
import { rateLimit } from "@/lib/guard";

export const dynamic = "force-dynamic";

/**
 * Accepts a rating carried by an anonymous token.
 *
 * There is deliberately no session, no cookie and no sign-in here: the token
 * proves the right to rate this one teacher, and proves nothing else. The row
 * is keyed by the token's hash, so sending the same token again edits that
 * rating instead of adding a second one.
 */

const score = z.number().int().min(1).max(5);

const RatingSchema = z.object({
  teacherId: z.string().min(1).max(32),
  prepared: z.string().min(1).max(2048),
  signature: z.string().min(1).max(2048),
  scores: z.object({
    clarity: score,
    knowledge: score,
    punctuality: score,
    fairness: score,
    accessibility: score,
    engagement: score,
    overall: score,
    difficulty: score,
  }),
  takeAgain: z.boolean(),
});

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB;

  // Tokens already cap how many ratings one student can make, and a whole
  // department may be rating from the same campus connection, so this is set
  // high: it only slows down bulk submission attempts.
  if (!(await rateLimit(request, "rate", 1200)).ok) {
    return Response.json(
      { error: "Too many ratings from this connection. Please try again later." },
      { status: 429 },
    );
  }

  const parsed = RatingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "That rating was not in the expected shape." }, { status: 400 });
  }
  const { teacherId, prepared, signature, scores, takeAgain } = parsed.data;

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

  // The signature only verifies under this teacher's key for this term, so a
  // token issued for one teacher cannot be spent on another.
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

  const hash = await tokenHash(fromBase64(prepared), fromBase64(signature));
  const values = CRITERION_KEYS.map((key) => scores[key]);

  // Stored with the date only: a precise timestamp would let someone line a
  // rating up with a sign-in.
  const result = await db
    .prepare(
      `INSERT INTO ratings (
         token_hash, teacher_id, term_id,
         clarity, knowledge, punctuality, fairness, accessibility, engagement,
         overall, difficulty, take_again, rated_on
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
       ON CONFLICT(token_hash) DO UPDATE SET
         clarity = excluded.clarity, knowledge = excluded.knowledge,
         punctuality = excluded.punctuality, fairness = excluded.fairness,
         accessibility = excluded.accessibility, engagement = excluded.engagement,
         overall = excluded.overall, difficulty = excluded.difficulty,
         take_again = excluded.take_again, tags = '[]',
         rated_on = excluded.rated_on`,
    )
    .bind(
      hash,
      teacherId,
      term.id,
      ...values,
      scores.overall,
      scores.difficulty,
      takeAgain ? 1 : 0,
      todayIso(),
    )
    .run();

  return Response.json({
    ok: true,
    updated: result.meta.changes > 0,
    note: "Published in the next daily update.",
  });
}
