import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import { blindSign, fromBase64, toBase64 } from "@/lib/blind";
import { decryptJson, studentHmac, todayIso } from "@/lib/server-crypto";
import { VerificationError, studentIdFromIdToken } from "@/lib/google-verify";
import { StudentIdError, parseStudentId } from "@/lib/student-id";
import { DEPARTMENT_BY_SLUG, rateableDepartments } from "@/lib/departments";
import { rateLimit, verifyTurnstile } from "@/lib/guard";

export const dynamic = "force-dynamic";

/**
 * Two calls live here.
 *
 *   POST { idToken }                           -> department, teachers, chunk size
 *   POST { idToken, chunk, blinded: [...] }    -> signatures for that chunk
 *
 * Signing is split into small chunks so a single request stays well inside the
 * Workers CPU limit, and so a dropped connection costs a student a few teachers
 * rather than all of them.
 *
 * The server decides which teachers each chunk covers, from a fixed order. That
 * is what stops a student spending every token on one teacher: they cannot
 * choose who a chunk is for. Progress is a single counter on the issuance row —
 * no teacher is ever recorded against a student.
 */

/** Teachers signed per request. Sized from measured signing cost. */
export const CHUNK_SIZE = 4;

const RequestSchema = z.object({
  // Real Google ID tokens are long; the lower bound only rejects empty input
  // (the dev sign-in string is short by design).
  idToken: z.string().min(8).max(8192),
  /** Set by legacy code 207 students who pick their marine unit. */
  deptChoice: z.string().optional(),
  turnstileToken: z.string().max(4096).optional(),
  /** Which slice of the student's teacher list this request is for. */
  chunk: z.number().int().min(0).max(500).optional(),
  blinded: z
    .array(
      z.object({
        teacherId: z.string().min(1).max(32),
        blinded: z.string().min(1).max(2048),
      }),
    )
    .max(200)
    .optional(),
});

function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const { env: cfEnv } = await getCloudflareContext({ async: true });

  // Generous on purpose: a whole campus shares a handful of IP addresses, and
  // one student now makes about eight calls (one per chunk). The real limit on
  // issuance is the one-row-per-student rule below, not this; this only stops
  // scripted hammering.
  if (!(await rateLimit(request, "issue", 1200)).ok) {
    return fail("Too many attempts. Please try again later.", 429);
  }

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Malformed request.");
  const { idToken, blinded, deptChoice, turnstileToken, chunk } = parsed.data;

  if (!(await verifyTurnstile(turnstileToken))) {
    return fail("Please complete the check that you are not a robot.", 403);
  }

  // ---- Who is this student? (held in memory, never stored) --------------
  let studentId: string;
  try {
    if (cfEnv.ALLOW_DEV_LOGIN === "1" && idToken.startsWith("dev:")) {
      // Local development only: lets the flow be exercised without a Google
      // client. Never enabled in production.
      studentId = idToken.slice(4);
      if (!/^\d{8}$/.test(studentId)) return fail("Dev login needs an 8-digit ID.");
    } else {
      if (!cfEnv.GOOGLE_CLIENT_ID) return fail("Sign-in is not configured.", 500);
      studentId = await studentIdFromIdToken(idToken, cfEnv.GOOGLE_CLIENT_ID);
    }
  } catch (error) {
    if (error instanceof VerificationError) return fail(error.message, 401);
    return fail("Sign-in could not be verified.", 401);
  }

  // ---- Which department? ------------------------------------------------
  let deptSlug: string;
  let session: string;
  try {
    const details = parseStudentId(studentId);
    session = details.session;
    if (details.deptSlug) {
      deptSlug = details.deptSlug;
    } else if (deptChoice && details.ambiguousChoices?.includes(deptChoice)) {
      deptSlug = deptChoice;
    } else {
      return Response.json(
        {
          needsChoice: true,
          session: details.session,
          choices: (details.ambiguousChoices ?? []).map((slug) => ({
            slug,
            name: DEPARTMENT_BY_SLUG[slug]?.name ?? slug,
          })),
        },
        { status: 200 },
      );
    }
  } catch (error) {
    if (error instanceof StudentIdError) return fail(error.message, 422);
    return fail("That student ID could not be read.", 422);
  }

  const term = await cfEnv.DB.prepare(
    `SELECT id, label FROM terms WHERE is_open = 1 ORDER BY opens_at DESC LIMIT 1`,
  ).first<{ id: string; label: string }>();
  if (!term) return fail("Rating is closed at the moment.", 503);

  type TeacherRow = {
    id: string;
    name: string;
    designation: string;
    dept_slug: string;
    photo_url: string | null;
    dept_name: string;
  };

  const departments = rateableDepartments(deptSlug);
  const slugs = departments.map((d) => d.slug);
  const { results: teachers } = await cfEnv.DB.prepare(
    `SELECT t.id, t.name, t.designation, t.dept_slug, t.photo_url, d.name AS dept_name
     FROM teachers t JOIN departments d ON d.slug = t.dept_slug
     WHERE t.active = 1 AND t.dept_slug IN (${slugs.map(() => "?").join(",")})
     ORDER BY t.dept_slug, t.sort_order, t.id`,
  )
    .bind(...slugs)
    .all<TeacherRow>();

  // ---- Step 1: tell the browser what it may ask to have signed ----------
  if (!blinded) {
    // Only this student's teachers: fetching every key for the term would read
    // a thousand rows to use twenty.
    const teacherIds = teachers.map((t) => t.id);
    const { results: keys } = await cfEnv.DB.prepare(
      `SELECT teacher_id, public_key FROM teacher_term_keys
       WHERE term_id = ?1 AND teacher_id IN (${teacherIds.map(() => "?").join(",")})`,
    )
      .bind(term.id, ...teacherIds)
      .all<{ teacher_id: string; public_key: string }>();
    const keyByTeacher = new Map(keys.map((k) => [k.teacher_id, k.public_key]));

    return Response.json({
      term: { id: term.id, label: term.label },
      session,
      chunkSize: CHUNK_SIZE,
      department: {
        slug: deptSlug,
        name: DEPARTMENT_BY_SLUG[deptSlug]?.name ?? deptSlug,
      },
      teachers: teachers
        .filter((t) => keyByTeacher.has(t.id))
        .map((t) => ({
          id: t.id,
          name: t.name,
          designation: t.designation,
          deptName: t.dept_name,
          photoUrl: t.photo_url,
          publicKey: JSON.parse(keyByTeacher.get(t.id) ?? "{}") as JsonWebKey,
        })),
    });
  }

  // ---- Step 2: sign, once per student per term --------------------------
  if (!cfEnv.MASTER_KEY || !cfEnv.TERM_PEPPER) return fail("Server is not configured.", 500);

  if (chunk === undefined) return fail("Which chunk is this request for?");

  const totalChunks = Math.ceil(teachers.length / CHUNK_SIZE);
  const expected = teachers.slice(chunk * CHUNK_SIZE, chunk * CHUNK_SIZE + CHUNK_SIZE);
  if (expected.length === 0) return fail("That chunk is past the end of the list.");

  // The client may only ask for exactly the teachers this chunk covers.
  const expectedIds = new Set(expected.map((t) => t.id));
  const requested = blinded.filter((b) => expectedIds.has(b.teacherId));
  if (requested.length !== expected.length || requested.length !== blinded.length) {
    return fail("This request does not match the teachers for that chunk.");
  }

  const hmac = await studentHmac(cfEnv.TERM_PEPPER!, studentId);
  await cfEnv.DB.prepare(
    `INSERT OR IGNORE INTO issuances (term_id, student_hmac, issued_on, next_index)
     VALUES (?1, ?2, ?3, 0)`,
  )
    .bind(term.id, hmac, todayIso())
    .run();

  // Advancing the counter and claiming the chunk are the same statement, so two
  // requests for one chunk cannot both succeed.
  const claimed = await cfEnv.DB.prepare(
    `UPDATE issuances SET next_index = ?4
     WHERE term_id = ?1 AND student_hmac = ?2 AND next_index = ?3`,
  )
    .bind(term.id, hmac, chunk, chunk + 1)
    .run();

  if (claimed.meta.changes === 0) {
    const row = await cfEnv.DB.prepare(
      `SELECT next_index FROM issuances WHERE term_id = ?1 AND student_hmac = ?2`,
    )
      .bind(term.id, hmac)
      .first<{ next_index: number }>();
    const done = row?.next_index ?? 0;
    return Response.json(
      {
        error:
          done > chunk
            ? "These tokens were already issued and cannot be issued twice — that is what stops double voting. Carry on with the rest, or restore a backup from the browser you used."
            : "Chunks must be requested in order.",
        alreadyIssued: done > chunk,
        nextChunk: done,
        totalChunks,
      },
      { status: 409 },
    );
  }

  // Private keys are large; read only the ones about to be used.
  const requestedIds = requested.map((r) => r.teacherId);
  const { results: keyRows } = requestedIds.length
    ? await cfEnv.DB.prepare(
        `SELECT teacher_id, private_key_wrapped FROM teacher_term_keys
         WHERE term_id = ?1 AND teacher_id IN (${requestedIds.map(() => "?").join(",")})`,
      )
        .bind(term.id, ...requestedIds)
        .all<{ teacher_id: string; private_key_wrapped: string }>()
    : { results: [] as { teacher_id: string; private_key_wrapped: string }[] };
  const wrappedByTeacher = new Map(keyRows.map((k) => [k.teacher_id, k.private_key_wrapped]));

  // Signed concurrently: a student waits on one round trip for every teacher
  // in their department, so doing these one after another is felt directly.
  const signed = await Promise.all(
    requested.map(async (item) => {
      const wrapped = wrappedByTeacher.get(item.teacherId);
      if (!wrapped) return null;
      const privateJwk = await decryptJson<JsonWebKey>(cfEnv.MASTER_KEY!, wrapped);
      const signature = await blindSign(privateJwk, fromBase64(item.blinded));
      return { teacherId: item.teacherId, blindSignature: toBase64(signature) };
    }),
  );
  const signatures = signed.filter((s) => s !== null);

  return Response.json({
    term: { id: term.id, label: term.label },
    signatures,
    chunk,
    nextChunk: chunk + 1,
    totalChunks,
  });
}
