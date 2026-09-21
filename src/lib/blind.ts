/**
 * Anonymous rating tokens, built on RSA blind signatures (RFC 9474).
 *
 * The student's browser generates a random nonce and blinds it. The server
 * signs the blinded value with the key belonging to one teacher for one term,
 * so the signature it produces is useless for any other teacher — but the
 * server never sees the nonce, and cannot recognise the finished token when it
 * comes back attached to a rating.
 *
 * Nothing here ties a token to a person: that is the whole point.
 */
import { RSABSSA } from "@cloudflare/blindrsa-ts";

export const suite = RSABSSA.SHA384.PSS.Randomized();

/**
 * Signing suite for the server.
 *
 * Cloudflare Workers implement the non-standard `RSA-RAW` algorithm, which lets
 * the blind signature be one native RSA operation. Everywhere else the library
 * falls back to big-number arithmetic in JavaScript, which costs roughly half a
 * second per signature — fine for a local dev server, far too slow for a
 * student waiting on twenty-odd teachers.
 */
const onWorkers =
  typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

export const signingSuite = RSABSSA.SHA384.PSS.Randomized({
  supportsRSARAW: onWorkers,
});

export const KEY_ALGORITHM: RsaHashedKeyGenParams = {
  name: "RSA-PSS",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-384",
};

export function toBase64(bytes: Uint8Array<ArrayBufferLike>): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", jwk, { name: "RSA-PSS", hash: "SHA-384" }, true, [
    "verify",
  ]);
}

export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", jwk, { name: "RSA-PSS", hash: "SHA-384" }, true, [
    "sign",
  ]);
}

/**
 * SHA-256 over the token, in one of two domains.
 *
 * A rating and a written review are carried by the same token but filed under
 * different hashes of it, so the two tables share no value. That is what stops
 * anyone holding the database from reading "never turns up" next to the 1 out
 * of 5 it arrived with — and it is why the domain string is not cosmetic.
 */
async function digestToken(
  preparedMsg: Uint8Array,
  signature: Uint8Array,
  domain: string,
): Promise<string> {
  const suffix = new TextEncoder().encode(domain);
  const joined = new Uint8Array(
    new ArrayBuffer(preparedMsg.length + signature.length + suffix.length),
  );
  joined.set(preparedMsg, 0);
  joined.set(signature, preparedMsg.length);
  joined.set(suffix, preparedMsg.length + signature.length);
  const digest = await crypto.subtle.digest("SHA-256", joined);
  return toBase64(new Uint8Array(digest)).replace(/[+/=]/g, (c) =>
    c === "+" ? "-" : c === "/" ? "_" : "",
  );
}

/** The rating's primary key. */
export async function tokenHash(
  preparedMsg: Uint8Array,
  signature: Uint8Array,
): Promise<string> {
  return digestToken(preparedMsg, signature, "");
}

/** The review's primary key. Unrelatable to the rating's, without the token. */
export async function reviewHash(
  preparedMsg: Uint8Array,
  signature: Uint8Array,
): Promise<string> {
  return digestToken(preparedMsg, signature, "review-v1");
}


/* ---- Client side ------------------------------------------------------- */

export type BlindRequest = {
  teacherId: string;
  /** The prepared message, kept by the client and revealed only when rating. */
  prepared: Uint8Array;
  inv: Uint8Array;
  blinded: Uint8Array;
};

/** Creates one blinded request for a teacher, using that teacher's term key. */
export async function createBlindRequest(
  teacherId: string,
  publicJwk: JsonWebKey,
): Promise<BlindRequest> {
  const publicKey = await importPublicKey(publicJwk);
  const nonce = crypto.getRandomValues(new Uint8Array(32));
  const prepared = suite.prepare(nonce);
  const { blindedMsg, inv } = await suite.blind(publicKey, prepared);
  return { teacherId, prepared, inv, blinded: blindedMsg };
}

/** Unblinds a server signature into a usable token. */
export async function finalizeToken(
  request: BlindRequest,
  publicJwk: JsonWebKey,
  blindSignature: Uint8Array,
): Promise<{ teacherId: string; prepared: string; signature: string }> {
  const publicKey = await importPublicKey(publicJwk);
  const signature = await suite.finalize(
    publicKey,
    request.prepared,
    blindSignature,
    request.inv,
  );
  return {
    teacherId: request.teacherId,
    prepared: toBase64(request.prepared),
    signature: toBase64(signature),
  };
}

/* ---- Server side ------------------------------------------------------- */

export async function blindSign(
  privateJwk: JsonWebKey,
  blinded: Uint8Array,
): Promise<Uint8Array> {
  // RSA-RAW keys must be imported under that algorithm name for the fast path.
  // The stored JWK carries `alg: "PS384"`, which RSA-RAW does not recognise,
  // so drop it (and the PSS key_ops) for this import only.
  const privateKey = onWorkers
    ? await crypto.subtle.importKey(
        "jwk",
        { ...privateJwk, alg: undefined, key_ops: ["sign"] },
        { name: "RSA-RAW", hash: "SHA-384" } as unknown as RsaHashedImportParams,
        true,
        ["sign"],
      )
    : await importPrivateKey(privateJwk);
  return signingSuite.blindSign(privateKey, blinded);
}

export async function verifyToken(
  publicJwk: JsonWebKey,
  prepared: Uint8Array,
  signature: Uint8Array,
): Promise<boolean> {
  try {
    const publicKey = await importPublicKey(publicJwk);
    return await suite.verify(publicKey, signature, prepared);
  } catch {
    return false;
  }
}
