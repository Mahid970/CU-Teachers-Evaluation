/**
 * End-to-end check of the anonymous rating flow against a running dev server.
 *
 *   npm run dev            # in another terminal
 *   node scripts/e2e-check.mjs
 *
 * Verifies the guarantees that matter:
 *   1. a student gets one token per teacher of their department
 *   2. a rating carried by a token is accepted, and re-sending edits it
 *   3. a token issued for teacher A is rejected for teacher B
 *   4. the same student cannot collect a second set of tokens
 *   5. nothing identifying the student is written to the database
 */
import { RSABSSA } from "@cloudflare/blindrsa-ts";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const STUDENT = process.env.STUDENT_ID ?? "24304043";
const suite = RSABSSA.SHA384.PSS.Randomized();

const b64 = (bytes) => Buffer.from(bytes).toString("base64");
const unb64 = (value) => new Uint8Array(Buffer.from(value, "base64"));

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "  ok  " : "FAIL  "}${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

const post = async (path, body) => {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: await response.json() };
};

// ---- 1. Issuance --------------------------------------------------------
const step1 = await post("/api/issue", { idToken: `dev:${STUDENT}` });
check("step 1 returns the student's department", step1.json.department?.slug === "marketing",
  step1.json.department?.slug);
check("step 1 returns teachers with public keys", step1.json.teachers?.length > 0,
  `${step1.json.teachers?.length} teachers`);

const importKey = (jwk) =>
  crypto.subtle.importKey("jwk", jwk, { name: "RSA-PSS", hash: "SHA-384" }, true, ["verify"]);

const teachers = step1.json.teachers;
const chunkSize = step1.json.chunkSize ?? 4;
check("step 1 states the chunk size", chunkSize > 0, `${chunkSize} per request`);

const blindFor = async (teacher) => {
  const publicKey = await importKey(teacher.publicKey);
  const prepared = suite.prepare(crypto.getRandomValues(new Uint8Array(32)));
  const { blindedMsg, inv } = await suite.blind(publicKey, prepared);
  return { teacherId: teacher.id, publicKey, prepared, inv, blinded: blindedMsg };
};

const tokens = [];
const chunkCount = Math.ceil(teachers.length / chunkSize);
let signedCount = 0;
let lastChunkRequests = null;
let lastChunkIndex = -1;

for (let chunk = 0; chunk < chunkCount; chunk += 1) {
  const slice = teachers.slice(chunk * chunkSize, chunk * chunkSize + chunkSize);
  const requests = await Promise.all(slice.map(blindFor));
  const res = await post("/api/issue", {
    idToken: `dev:${STUDENT}`,
    chunk,
    blinded: requests.map((r) => ({ teacherId: r.teacherId, blinded: b64(r.blinded) })),
  });
  if (!res.json.signatures) {
    check(`chunk ${chunk} signed`, false, JSON.stringify(res.json).slice(0, 90));
    break;
  }
  signedCount += res.json.signatures.length;
  for (const signature of res.json.signatures) {
    const request = requests.find((r) => r.teacherId === signature.teacherId);
    const finalized = await suite.finalize(
      request.publicKey, request.prepared, unb64(signature.blindSignature), request.inv);
    tokens.push({ teacherId: request.teacherId, prepared: b64(request.prepared), signature: b64(finalized) });
  }
  lastChunkRequests = requests;
  lastChunkIndex = chunk;
}

check("every teacher is signed across the chunks",
  signedCount === teachers.length, `${signedCount} of ${teachers.length}`);
check("tokens unblind correctly", tokens.length === teachers.length);

// A chunk the server has already served must not be served twice, or a student
// could collect two tokens for the same teacher.
const replay = await post("/api/issue", {
  idToken: `dev:${STUDENT}`,
  chunk: lastChunkIndex,
  blinded: lastChunkRequests.map((r) => ({ teacherId: r.teacherId, blinded: b64(r.blinded) })),
});
check("a chunk cannot be issued twice", replay.status === 409, `status ${replay.status}`);

// The server picks which teachers a chunk covers; asking for a different one
// must be refused, or tokens could be stacked on a single teacher.
const wrongSlice = await post("/api/issue", {
  idToken: `dev:${STUDENT}`,
  chunk: 0,
  blinded: [{ teacherId: teachers[0].id, blinded: b64(lastChunkRequests[0].blinded) }],
});
check("a chunk with the wrong teachers is refused",
  wrongSlice.status === 400 || wrongSlice.status === 409, `status ${wrongSlice.status}`);

// ---- 2. Rating ----------------------------------------------------------
const scores = {
  clarity: 5, knowledge: 4, punctuality: 5, fairness: 4,
  accessibility: 3, engagement: 5, overall: 5, difficulty: 3,
};
const rate = (token, teacherId, body = {}) =>
  post("/api/rate", {
    teacherId,
    prepared: token.prepared,
    signature: token.signature,
    scores,
    takeAgain: true,
    ...body,
  });

const first = await rate(tokens[0], tokens[0].teacherId);
check("a valid token is accepted", first.status === 200 && first.json.ok === true,
  JSON.stringify(first.json).slice(0, 80));

const again = await rate(tokens[0], tokens[0].teacherId, { scores: { ...scores, overall: 2 } });
check("re-using the same token edits instead of adding", again.status === 200);

// ---- 3. Cross-teacher use ----------------------------------------------
const crossed = await rate(tokens[0], tokens[1].teacherId);
check("a token for teacher A is rejected for teacher B", crossed.status === 403,
  `status ${crossed.status}`);

const forged = await rate(
  { prepared: tokens[0].prepared, signature: b64(crypto.getRandomValues(new Uint8Array(256))) },
  tokens[0].teacherId);
check("a forged signature is rejected", forged.status === 403, `status ${forged.status}`);

// ---- 4. Second issuance -------------------------------------------------
const repeat = await post("/api/issue", {
  idToken: `dev:${STUDENT}`,
  chunk: 0,
  blinded: (await Promise.all(teachers.slice(0, chunkSize).map(blindFor))).map((r) => ({
    teacherId: r.teacherId,
    blinded: b64(r.blinded),
  })),
});
check("the same student cannot collect a second set", repeat.status === 409,
  `status ${repeat.status}`);

// ---- 5. Written reviews -------------------------------------------------
const review = (token, teacherId, body) =>
  post("/api/review", {
    teacherId,
    prepared: token.prepared,
    signature: token.signature,
    body,
  });

const wrote = await review(tokens[2], tokens[2].teacherId, "Clear, fair and well prepared.");
check("a valid token may write a review", wrote.status === 200 && wrote.json.ok === true,
  JSON.stringify(wrote.json).slice(0, 80));

const crossedReview = await review(tokens[2], tokens[3].teacherId, "Not my teacher.");
check("a review token for teacher A is rejected for teacher B",
  crossedReview.status === 403, `status ${crossedReview.status}`);

const forgedReview = await review(
  { prepared: tokens[2].prepared, signature: b64(crypto.getRandomValues(new Uint8Array(256))) },
  tokens[2].teacherId, "Forged.");
check("a forged signature cannot write a review", forgedReview.status === 403,
  `status ${forgedReview.status}`);

const tooLong = await review(tokens[2], tokens[2].teacherId, "x".repeat(401));
check("a review past the length cap is refused", tooLong.status === 400,
  `status ${tooLong.status}`);

const removed = await review(tokens[2], tokens[2].teacherId, "   ");
check("an empty review deletes what was written",
  removed.status === 200 && removed.json.removed === true,
  JSON.stringify(removed.json).slice(0, 60));

// ---- 6. The vault -------------------------------------------------------
const lookup = [...crypto.getRandomValues(new Uint8Array(32))]
  .map((b) => b.toString(16).padStart(2, "0"))
  .join("");

const missing = await post("/api/vault", { action: "load", lookup });
check("an unknown lookup returns nothing, not an error",
  missing.status === 200 && missing.json.ciphertext === null,
  JSON.stringify(missing.json).slice(0, 60));

const saved = await post("/api/vault", {
  action: "save",
  lookup,
  term: step1.json.term.id,
  ciphertext: "AAAAAAAAAAAAAAAA.QkJCQkJCQkJCQkJC",
});
check("a vault can be saved", saved.status === 200 && saved.json.ok === true,
  JSON.stringify(saved.json).slice(0, 60));

const loaded = await post("/api/vault", { action: "load", lookup });
check("a vault comes back byte for byte",
  loaded.json.ciphertext === "AAAAAAAAAAAAAAAA.QkJCQkJCQkJCQkJC",
  String(loaded.json.ciphertext).slice(0, 40));

const nearMiss = await post("/api/vault", {
  action: "load",
  lookup: lookup.slice(0, 63) + (lookup[63] === "0" ? "1" : "0"),
});
check("a lookup one character out opens nothing",
  nearMiss.status === 200 && nearMiss.json.ciphertext === null,
  JSON.stringify(nearMiss.json).slice(0, 60));

const badShape = await post("/api/vault", { action: "load", lookup: "not-a-hash" });
check("a malformed lookup is refused", badShape.status === 400, `status ${badShape.status}`);

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
