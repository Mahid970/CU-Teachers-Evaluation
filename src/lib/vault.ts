"use client";

/**
 * Cross-device rating, without letting the server link a student to a rating.
 *
 * The problem: if signing in with your email were enough to get your tokens
 * back, the server would be holding your tokens — and your tokens are exactly
 * what your ratings are filed under. One join and it knows what you said.
 *
 * So the tokens are encrypted here, in the browser, under a key derived from a
 * passphrase that never leaves this machine, and only the ciphertext is
 * uploaded. Two details make that worth something:
 *
 *  - The student ID is read out of the Google token locally, never asked for.
 *    The server is never in a position to see an ID and a vault lookup at once.
 *  - The lookup is derived from the ID *and* the passphrase together, so the
 *    stored row cannot be attributed to a student without the passphrase.
 *
 * There is no reset, and there cannot be: a reset means the server can open the
 * vault by itself, which is the thing this whole design exists to prevent.
 */
import { toBase64 } from "./blind";
import { type TokenBundle, loadBundle, saveBundle } from "./tokens-client";

/**
 * Deliberately expensive. Each guess an attacker tries costs them this much
 * too, which is the only thing standing between a weak passphrase and the
 * tokens. Measured at roughly a second on a mid-range phone.
 */
const PBKDF2_ITERATIONS = 400_000;
const SALT_PREFIX = "cu-rate-vault-v1:";

const bytes = (value: string) =>
  new TextEncoder().encode(value) as Uint8Array<ArrayBuffer>;

const hex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/**
 * What a passphrase means, as opposed to how it was typed.
 *
 * Phone keyboards capitalise the first letter, autocorrect words and add a
 * space after a suggestion, and none of that is visible in a password field.
 * A vault must open with the words, not the keystrokes, so case, spacing and
 * Unicode forms are all folded before anything is derived. It costs a little
 * entropy and saves students from locking themselves out.
 */
export function normalizePassphrase(passphrase: string): string {
  return passphrase.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
}

export type VaultKeys = {
  /** Names the row on the server. Reveals neither the ID nor the passphrase. */
  lookup: string;
  key: CryptoKey;
  /** The same key as bytes, so the tab can keep it without re-deriving. */
  raw: ArrayBuffer;
};

/**
 * Turns a passphrase into the two things the vault needs.
 *
 * One PBKDF2 pass produces 64 bytes: the first half encrypts, the second half
 * names the row. Splitting one derivation rather than running two means the
 * cost above is paid once.
 */
export async function deriveVaultKeys(
  studentId: string,
  passphrase: string,
): Promise<VaultKeys> {
  const material = await crypto.subtle.importKey(
    "raw",
    bytes(normalizePassphrase(passphrase)),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      // Per-student salt: two students who pick the same passphrase still get
      // different keys, and one table of precomputed guesses cannot serve both.
      salt: bytes(SALT_PREFIX + studentId),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-512",
    },
    material,
    512,
  );

  const half = new Uint8Array(derived, 0, 32);
  const lookupSeed = new Uint8Array(derived, 32, 32);

  const key = await crypto.subtle.importKey("raw", half, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);

  const lookup = hex(
    await crypto.subtle.digest(
      "SHA-256",
      bytes(`${SALT_PREFIX}lookup:${studentId}:${toBase64(lookupSeed)}`),
    ),
  );

  return { lookup, key, raw: derived.slice(0, 32) };
}

async function seal(key: CryptoKey, bundle: TokenBundle): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      bytes(JSON.stringify(bundle)),
    ),
  );
  return `${toBase64(iv)}.${toBase64(cipher)}`;
}

async function open(key: CryptoKey, payload: string): Promise<TokenBundle> {
  const [ivPart, cipherPart] = payload.split(".");
  if (!ivPart || !cipherPart) throw new VaultError("That vault could not be read.");
  const decode = (value: string) => {
    const binary = atob(value);
    const out = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  };
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decode(ivPart) },
    key,
    decode(cipherPart),
  );
  return JSON.parse(new TextDecoder().decode(plain)) as TokenBundle;
}

export class VaultError extends Error {}

/* ---- The student ID, read locally -------------------------------------- */

/**
 * Reads the student ID out of the Google token in the browser.
 *
 * The server verifies that token properly; this only needs the address the
 * student already knows. Asking the server for it instead would put the ID and
 * the vault lookup in the same conversation, which is what we are avoiding.
 */
export function studentIdFromToken(idToken: string): string {
  if (idToken.startsWith("dev:")) {
    const id = idToken.slice(4);
    if (!/^\d{8}$/.test(id)) throw new VaultError("That is not a student ID.");
    return id;
  }
  try {
    const payload = idToken.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const email = (JSON.parse(json) as { email?: string }).email ?? "";
    const id = email.split("@")[0];
    if (!/^\d{8}$/.test(id)) throw new Error("no id");
    return id;
  } catch {
    throw new VaultError("Your student ID could not be read from that sign-in.");
  }
}

/* ---- Talking to the server --------------------------------------------- */

async function call<T>(body: unknown): Promise<T> {
  const response = await fetch("/api/vault", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new VaultError(payload.error ?? "The vault is unavailable.");
  return payload;
}

export async function saveVault(keys: VaultKeys, bundle: TokenBundle): Promise<void> {
  await call({
    action: "save",
    lookup: keys.lookup,
    term: bundle.term,
    ciphertext: await seal(keys.key, bundle),
  });
}

export async function loadVault(keys: VaultKeys): Promise<TokenBundle | null> {
  const { ciphertext } = await call<{ ciphertext: string | null }>({
    action: "load",
    lookup: keys.lookup,
  });
  if (!ciphertext) return null;
  try {
    return await open(keys.key, ciphertext);
  } catch {
    // AES-GCM refuses to decrypt under the wrong key, which is how a wrong
    // passphrase shows up. The server cannot tell us this; only the maths can.
    throw new VaultError("That passphrase does not open this vault.");
  }
}

/* ---- Keeping the vault current ----------------------------------------- */

const SESSION_KEY = "cu_eval_vault_session";

/**
 * The derived key is kept for the life of the tab, so rating can push progress
 * without asking for the passphrase again.
 *
 * It sits in `sessionStorage`, which sounds worse than it is: the tokens it
 * protects are already in this browser in the clear, so anything able to read
 * one can read the other. It dies with the tab, and the passphrase itself is
 * never written anywhere.
 */
let liveKeys: VaultKeys | null = null;

export function holdKeys(keys: VaultKeys): void {
  liveKeys = keys;
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ lookup: keys.lookup, key: toBase64(new Uint8Array(keys.raw)) }),
    );
  } catch {
    // The in-memory copy still works for this page.
  }
}

async function rehydrate(): Promise<VaultKeys | null> {
  if (liveKeys) return liveKeys;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { lookup: string; key: string };
    const binary = atob(saved.key);
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    liveKeys = {
      lookup: saved.lookup,
      raw: bytes.buffer,
      key: await crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, [
        "encrypt",
        "decrypt",
      ]),
    };
    return liveKeys;
  } catch {
    return null;
  }
}

export async function vaultIsUnlocked(): Promise<boolean> {
  return (await rehydrate()) !== null;
}

export function lockVault(): void {
  liveKeys = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* nothing to clear */
  }
}

/**
 * Pushes the current bundle up, if this tab has been unlocked.
 *
 * Called after rating and again on every sign-in — the second one matters. A
 * vault that changed only when somebody rated would announce, by the bare fact
 * of changing, that a rating had just been made.
 */
export async function syncVault(term?: string): Promise<void> {
  const keys = await rehydrate();
  if (!keys) return;
  const bundle = loadBundle(term);
  if (!bundle) return;
  try {
    await saveVault(keys, bundle);
  } catch {
    // Progress is a convenience. Failing to sync must never cost a rating.
  }
}

/** Puts a restored bundle into this browser and unlocks the tab. */
export function adoptRestored(bundle: TokenBundle, keys: VaultKeys): void {
  saveBundle(bundle);
  holdKeys(keys);
}
