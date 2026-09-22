/**
 * Generates a blind-signing key pair for every active teacher who lacks one.
 *
 *   npm run keys:gen -- --term 2026-1            # local
 *   npm run keys:gen -- --term 2026-1 --remote
 *
 * Existing keys are never touched. Ratings are permanent, so students hold
 * tokens signed with today's keys indefinitely: replacing a key would silently
 * invalidate every one of them. That makes this safe to re-run after new
 * teachers are added (see teachers:sync), which is exactly when it is needed.
 *
 * The public half goes to D1 in the clear; the private half is wrapped with
 * MASTER_KEY before it is stored.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { webcrypto } from "node:crypto";
import { KEY_ALGORITHM, toBase64 } from "../src/lib/blind";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const term = flag("term");
const label: string = flag("label") ?? term ?? "";
const remote = args.includes("--remote");
const opensAt = flag("opens") ?? new Date().toISOString().slice(0, 10);
const closesAt = flag("closes") ?? "9999-12-31";

if (!term) {
  console.error("Usage: npm run keys:gen -- --term 2026-1 [--remote]");
  process.exit(1);
}
const termId: string = term;

const masterKey = process.env.MASTER_KEY;
if (!masterKey) {
  console.error(
    "MASTER_KEY is not set. Generate one with:\n" +
      "  node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"\n" +
      "then export it locally and store it with: npx wrangler secret put MASTER_KEY",
  );
  process.exit(1);
}

const crypto = webcrypto as unknown as Crypto;

async function wrap(value: unknown): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    Buffer.from(masterKey!, "base64"),
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(JSON.stringify(value)),
    ),
  );
  return `${toBase64(iv)}.${toBase64(cipher)}`;
}

const idsRaw = execFileSync(
  "npx",
  [
    "wrangler",
    "d1",
    "execute",
    "cu-teacher-eval",
    remote ? "--remote" : "--local",
    "--json",
    "--command",
    `SELECT t.id FROM teachers t
     WHERE t.active = 1
       AND NOT EXISTS (SELECT 1 FROM teacher_term_keys k
                       WHERE k.teacher_id = t.id AND k.term_id = '${termId.replace(/'/g, "''")}')`,
  ],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);
const teacherIds: string[] = JSON.parse(idsRaw)[0].results.map((r: { id: string }) => r.id);

const q = (v: string) => `'${v.replace(/'/g, "''")}'`;
const lines = [
  // Creates the term the first time; an existing one is left exactly as it is.
  `INSERT OR IGNORE INTO terms (id, label, opens_at, closes_at, is_open) VALUES (${q(termId)}, ${q(label)}, ${q(opensAt)}, ${q(closesAt)}, 1);`,
];

async function main() {
if (teacherIds.length === 0) {
  console.log("Every active teacher already has a key. Nothing to do.");
  return;
}
let done = 0;
for (const teacherId of teacherIds) {
  const pair = await crypto.subtle.generateKey(KEY_ALGORITHM, true, ["sign", "verify"]);
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  lines.push(
    `INSERT OR IGNORE INTO teacher_term_keys (teacher_id, term_id, public_key, private_key_wrapped) VALUES (${q(teacherId)}, ${q(termId)}, ${q(JSON.stringify(publicJwk))}, ${q(await wrap(privateJwk))});`,
  );
  done += 1;
  if (done % 200 === 0) console.log(`  ${done}/${teacherIds.length} keys`);
}

const file = join(mkdtempSync(join(tmpdir(), "cu-keys-")), "keys.sql");
writeFileSync(file, lines.join("\n"));

execFileSync(
  "npx",
  [
    "wrangler",
    "d1",
    "execute",
    "cu-teacher-eval",
    remote ? "--remote" : "--local",
    "--file",
    file,
  ],
  { stdio: "inherit" },
);

console.log(`\nGenerated ${done} new key pairs for term ${termId} (${remote ? "remote" : "local"}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
