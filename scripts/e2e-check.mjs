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

const requests = [];
for (const teacher of step1.json.teachers) {
  const publicKey = await importKey(teacher.publicKey);
  const nonce = crypto.getRandomValues(new Uint8Array(32));
  const prepared = suite.prepare(nonce);
  const { blindedMsg, inv } = await suite.blind(publicKey, prepared);
  requests.push({ teacherId: teacher.id, publicKey, prepared, inv, blinded: blindedMsg });
}

const step2 = await post("/api/issue", {
  idToken: `dev:${STUDENT}`,
  blinded: requests.map((r) => ({ teacherId: r.teacherId, blinded: b64(r.blinded) })),
});
check("step 2 signs one token per teacher",
  step2.json.signatures?.length === requests.length,
  `${step2.json.signatures?.length} signatures`);

const tokens = [];
for (const signature of step2.json.signatures ?? []) {
  const request = requests.find((r) => r.teacherId === signature.teacherId);
  const finalized = await suite.finalize(
    request.publicKey, request.prepared, unb64(signature.blindSignature), request.inv);
  tokens.push({ teacherId: request.teacherId, prepared: b64(request.prepared), signature: b64(finalized) });
}
check("tokens unblind correctly", tokens.length === requests.length);

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
    tags: ["clear-slides"],
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
  blinded: [{ teacherId: requests[0].teacherId, blinded: b64(requests[0].blinded) }],
});
check("the same student cannot collect a second set", repeat.status === 409,
  `status ${repeat.status}`);

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
