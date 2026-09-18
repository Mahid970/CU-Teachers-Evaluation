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
 *   POST { idToken }                       -> which department, which teachers
 *   POST { idToken, blinded: [...] }       -> one blind signature per teacher
 *
 * The second call writes exactly one row: an HMAC saying this student has
 * collected their tokens for this term. It never records which teachers were
 * requested, and it cannot see the tokens it is signing.
 */

const RequestSchema = z.object({
  // Real Google ID tokens are long; the lower bound only rejects empty input
  // (the dev sign-in string is short by design).
  idToken: z.string().min(8).max(8192),
  /** Set by legacy code 207 students who pick their marine unit. */
  deptChoice: z.string().optional(),
  turnstileToken: z.string().max(4096).optional(),
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

  // A signed-in student needs only a handful of calls; this stops scripted
  // hammering without recording who called.
  if (!(await rateLimit(request, "issue", 40)).ok) {
    return fail("Too many attempts. Please try again later.", 429);
  }

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Malformed request.");
  const { idToken, blinded, deptChoice, turnstileToken } = parsed.data;

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
     ORDER BY t.sort_order`,
  )
    .bind(...slugs)
    .all<TeacherRow>();

  // ---- Step 1: tell the browser what it may ask to have signed ----------
  if (!blinded) {
    const { results: keys } = await cfEnv.DB.prepare(
      `SELECT teacher_id, public_key FROM teacher_term_keys WHERE term_id = ?1`,
    )
      .bind(term.id)
      .all<{ teacher_id: string; public_key: string }>();
    const keyByTeacher = new Map(keys.map((k) => [k.teacher_id, k.public_key]));

    return Response.json({
      term: { id: term.id, label: term.label },
      session,
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

  const hmac = await studentHmac(cfEnv.TERM_PEPPER!, studentId);
  const claimed = await cfEnv.DB.prepare(
    `INSERT OR IGNORE INTO issuances (term_id, student_hmac, issued_on) VALUES (?1, ?2, ?3)`,
  )
    .bind(term.id, hmac, todayIso())
    .run();

  if (claimed.meta.changes === 0) {
    return Response.json(
      {
        error:
          "Tokens for this term were already issued to this student. They live in the browser you used, and cannot be issued twice — that is what stops double voting. Restore a backup from that device to keep rating.",
        alreadyIssued: true,
      },
      { status: 409 },
    );
  }

  const allowed = new Set(teachers.map((t) => t.id));
  const requested = blinded.filter((b) => allowed.has(b.teacherId));

  const { results: keyRows } = await cfEnv.DB.prepare(
    `SELECT teacher_id, private_key_wrapped FROM teacher_term_keys WHERE term_id = ?1`,
  )
    .bind(term.id)
    .all<{ teacher_id: string; private_key_wrapped: string }>();
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

  return Response.json({ term: { id: term.id, label: term.label }, signatures });
}
