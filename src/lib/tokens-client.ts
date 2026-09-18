"use client";

/**
 * The student's tokens live here — in their own browser, and nowhere else.
 *
 * Losing them means losing the ability to rate for the rest of the term, since
 * a second issuance would allow double voting. That is why the UI pushes the
 * backup file.
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
  } catch {
    /* nothing to clear */
  }
  notifyStoredValueChanged();
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

export type IssuableTeacher = {
  id: string;
  name: string;
  designation: string;
  deptName: string;
  photoUrl: string | null;
  publicKey: JsonWebKey;
};

/**
 * Blinds one nonce per teacher, asks the server to sign them, then unblinds.
 * The server sees only blinded values, so it cannot recognise the tokens later.
 */
export async function collectTokens(
  idToken: string,
  deptChoice: string | undefined,
  data: {
    term: { id: string; label: string };
    session: string;
    department: { slug: string; name: string };
    teachers: IssuableTeacher[];
  },
): Promise<TokenBundle> {
  const requests = await Promise.all(
    data.teachers.map((teacher) => createBlindRequest(teacher.id, teacher.publicKey)),
  );

  const response = await fetch("/api/issue", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      idToken,
      deptChoice,
      blinded: requests.map((r) => ({
        teacherId: r.teacherId,
        blinded: btoa(String.fromCharCode(...r.blinded)),
      })),
    }),
  });

  const payload = (await response.json()) as {
    error?: string;
    signatures?: { teacherId: string; blindSignature: string }[];
  };
  if (!response.ok || !payload.signatures) {
    throw new Error(payload.error ?? "Tokens could not be issued.");
  }

  const keyByTeacher = new Map(data.teachers.map((t) => [t.id, t.publicKey]));
  const tokens: RatingToken[] = [];
  for (const signature of payload.signatures) {
    const request = requests.find((r) => r.teacherId === signature.teacherId);
    const publicKey = keyByTeacher.get(signature.teacherId);
    if (!request || !publicKey) continue;
    tokens.push(
      await finalizeToken(request, publicKey, fromBase64(signature.blindSignature)),
    );
  }

  const bundle: TokenBundle = {
    version: 1,
    term: data.term.id,
    termLabel: data.term.label,
    department: data.department,
    session: data.session,
    issuedOn: new Date().toISOString().slice(0, 10),
    tokens,
    rated: [],
  };
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
