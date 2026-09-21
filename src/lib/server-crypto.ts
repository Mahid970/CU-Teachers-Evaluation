import "server-only";
import { fromBase64, toBase64 } from "./blind";

/**
 * Server-side secrets handling.
 *
 * MASTER_KEY wraps the per-teacher signing keys kept in D1. A term's PEPPER is
 * used to HMAC student IDs at issuance time; deleting the pepper when the term
 * closes makes those rows permanently unreadable, even by us.
 */

async function importAesKey(rawBase64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", fromBase64(rawBase64), { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptJson(masterKeyBase64: string, value: unknown): Promise<string> {
  const key = await importAesKey(masterKeyBase64);
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const data = new TextEncoder().encode(JSON.stringify(value)) as Uint8Array<ArrayBuffer>;
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data),
  );
  return `${toBase64(iv)}.${toBase64(cipher)}`;
}

export async function decryptJson<T>(masterKeyBase64: string, payload: string): Promise<T> {
  const [ivPart, cipherPart] = payload.split(".");
  const key = await importAesKey(masterKeyBase64);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivPart) },
    key,
    fromBase64(cipherPart),
  );
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

/** Keyed hash under a server secret. The secret is what makes it one-way. */
export async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret) as Uint8Array<ArrayBuffer>,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value) as Uint8Array<ArrayBuffer>,
  );
  return toBase64(new Uint8Array(mac));
}

/**
 * HMAC of a student ID under the term pepper. This is the only value derived
 * from a student that ever reaches storage, and it records nothing but
 * "this ID already collected its tokens for this term".
 */
export async function studentHmac(pepper: string, studentId: string): Promise<string> {
  return hmac(pepper, studentId);
}

/** Date with no time component: submissions must not be ordered by clock. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
