"use client";

/**
 * The student's tokens live here, in their own browser.
 *
 * A second issuance is refused — that is what stops double voting — so losing
 * this store used to mean losing the ability to rate for the rest of the term.
 * It no longer has to: `vault.ts` can put an encrypted copy somewhere the
 * server cannot read, which is what makes rating from a second device possible.
 * The backup file remains for students who would rather trust a file than a
 * passphrase.
 */
import { createBlindRequest, finalizeToken, fromBase64 } from "./blind";
import { notifyStoredValueChanged } from "./use-local-storage";

export type RatingToken = {
  teacherId: string;
  prepared: string;
  signature: string;
};

export type TokenBundle = {
  version: 1;
  term: string;
  termLabel: string;
  department: { slug: string; name: string };
  session: string;
  issuedOn: string;
  tokens: RatingToken[];
  /** Teacher IDs already rated from this device, so the UI can show progress. */
  rated: string[];
};

export const bundleKey = (term: string) => `cu_eval_tokens_${term}`;
export const LAST_TERM_KEY = "cu_eval_last_term";
export const EMAIL_HINT_KEY = "cu_eval_email";
/**
 * The student's own ID, kept locally so the vault key can be re-derived without
 * asking them to type it again. It is never sent anywhere: the vault endpoint
 * receives a hash and nothing else. Anyone who can read this can already read
 * the tokens beside it, so it gives away nothing new.
 */
export const STUDENT_KEY = "cu_eval_student";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be blocked or full; the caller shows a warning rather than
    // losing the tokens silently.
    throw new Error("This browser would not save your rating tokens.");
  }
}

export function loadBundle(term?: string): TokenBundle | null {
  const id = term ?? localStorage.getItem(LAST_TERM_KEY) ?? "";
  if (!id) return null;
  return read<TokenBundle>(bundleKey(id));
}

export function saveBundle(bundle: TokenBundle): void {
  write(bundleKey(bundle.term), bundle);
  try {
    localStorage.setItem(LAST_TERM_KEY, bundle.term);
  } catch {
    /* non-fatal */
  }
  notifyStoredValueChanged();
}

export function markRated(term: string, teacherId: string): void {
  const bundle = loadBundle(term);
  if (!bundle) return;
  if (!bundle.rated.includes(teacherId)) {
    bundle.rated.push(teacherId);
    saveBundle(bundle);
  }
}

export function tokenFor(term: string, teacherId: string): RatingToken | null {
  return loadBundle(term)?.tokens.find((t) => t.teacherId === teacherId) ?? null;
}

export function forgetDevice(): void {
  try {
    const term = localStorage.getItem(LAST_TERM_KEY);
    if (term) localStorage.removeItem(bundleKey(term));
    localStorage.removeItem(LAST_TERM_KEY);
    localStorage.removeItem(EMAIL_HINT_KEY);
    localStorage.removeItem(STUDENT_KEY);
  } catch {
    /* nothing to clear */
  }
  notifyStoredValueChanged();
}

export function rememberStudentId(studentId: string): void {
  try {
    if (/^\d{8}$/.test(studentId)) localStorage.setItem(STUDENT_KEY, studentId);
  } catch {
    /* the vault setup will ask for it instead */
  }
  notifyStoredValueChanged();
}

export function storedStudentId(): string {
  try {
    return localStorage.getItem(STUDENT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberEmailHint(email: string): void {
  try {
    localStorage.setItem(EMAIL_HINT_KEY, email);
  } catch {
    /* optional convenience only */
  }
}

export function emailHint(): string {
  try {
    return localStorage.getItem(EMAIL_HINT_KEY) ?? "";
  } catch {
    return "";
  }
}

/* ---- Issuance ---------------------------------------------------------- */

/**
 * Thrown when a student has already collected their tokens this term, so there
 * is nothing left to issue. It is not a failure — it means they should restore
 * from their vault rather than start again.
 */
export class AlreadyIssuedError extends Error {}

export type IssuableTeacher = {
  id: string;
  name: string;
  designation: string;
  deptName: string;
  photoUrl: string | null;
  publicKey: JsonWebKey;
};

/**
 * Collects the student's tokens, a few teachers at a time.
 *
 * Each chunk is blinded in the browser, signed by a server that cannot see the
 * secrets inside, and unblinded here. Chunks are saved as they arrive, so a
 * dropped connection costs a few teachers rather than the whole set.
 */
export async function collectTokens(
  idToken: string,
  deptChoice: string | undefined,
  data: {
    term: { id: string; label: string };
    session: string;
    department: { slug: string; name: string };
    teachers: IssuableTeacher[];
    chunkSize?: number;
  },
  onProgress?: (done: number, total: number) => void,
): Promise<TokenBundle> {
  const chunkSize = data.chunkSize ?? 4;
  const total = data.teachers.length;

  const bundle: TokenBundle = {
    version: 1,
    term: data.term.id,
    termLabel: data.term.label,
    department: data.department,
    session: data.session,
    issuedOn: new Date().toISOString().slice(0, 10),
    tokens: [],
    rated: [],
  };

  const chunkCount = Math.ceil(total / chunkSize);
  let firstError: string | null = null;
  let alreadyIssued = false;

  for (let chunk = 0; chunk < chunkCount; chunk += 1) {
    const slice = data.teachers.slice(chunk * chunkSize, chunk * chunkSize + chunkSize);
    const requests = await Promise.all(
      slice.map((teacher) => createBlindRequest(teacher.id, teacher.publicKey)),
    );

    const response = await fetch("/api/issue", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idToken,
        deptChoice,
        chunk,
        blinded: requests.map((r) => ({
          teacherId: r.teacherId,
          blinded: btoa(String.fromCharCode(...r.blinded)),
        })),
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      alreadyIssued?: boolean;
      nextChunk?: number;
      signatures?: { teacherId: string; blindSignature: string }[];
    };

    if (!response.ok || !payload.signatures) {
      // A chunk already issued on another device is skipped, not fatal: the
      // student can still collect the teachers they have not been served.
      if (payload.alreadyIssued) {
        alreadyIssued = true;
        firstError ??= payload.error ?? null;
        if (typeof payload.nextChunk === "number" && payload.nextChunk > chunk) {
          chunk = payload.nextChunk - 1;
        }
        continue;
      }
      if (bundle.tokens.length === 0) {
        throw new Error(payload.error ?? "Tokens could not be issued.");
      }
      firstError ??= payload.error ?? null;
      break;
    }

    const keyByTeacher = new Map(slice.map((t) => [t.id, t.publicKey]));
    for (const signature of payload.signatures) {
      const request = requests.find((r) => r.teacherId === signature.teacherId);
      const publicKey = keyByTeacher.get(signature.teacherId);
      if (!request || !publicKey) continue;
      bundle.tokens.push(
        await finalizeToken(request, publicKey, fromBase64(signature.blindSignature)),
      );
    }

    // Saved as we go, so a crash or a closed tab keeps what was collected.
    saveBundle(bundle);
    onProgress?.(bundle.tokens.length, total);
  }

  if (bundle.tokens.length === 0) {
    if (alreadyIssued) {
      throw new AlreadyIssuedError(
        firstError ?? "You have already collected your tokens this term.",
      );
    }
    throw new Error(firstError ?? "No tokens could be issued.");
  }

  saveBundle(bundle);
  return bundle;
}

/* ---- Backup ------------------------------------------------------------ */

export function downloadBackup(bundle: TokenBundle): void {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cu-rate-tokens-${bundle.term}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<TokenBundle> {
  const bundle = JSON.parse(await file.text()) as TokenBundle;
  if (bundle.version !== 1 || !Array.isArray(bundle.tokens)) {
    throw new Error("That file is not a rating token backup.");
  }
  saveBundle(bundle);
  return bundle;
}
