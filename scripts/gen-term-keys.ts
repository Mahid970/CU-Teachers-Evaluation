/**
 * Generates one blind-signing key pair per teacher for a term.
 *
 *   npm run keys:gen -- --term 2026-1 --label "Spring 2026"
 *   npm run keys:gen -- --term 2026-1 --remote
 *
 * The public half goes to D1 in the clear; the private half is wrapped with
 * MASTER_KEY before it is stored, and should be destroyed when the term closes
 * (scripts/close-term.ts).
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
const closesAt = flag("closes") ?? `${new Date().getFullYear()}-12-31`;

if (!term) {
  console.error('Usage: npm run keys:gen -- --term 2026-1 [--label "Spring 2026"] [--remote]');
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
    "SELECT id FROM teachers WHERE active = 1",
  ],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);
const teacherIds: string[] = JSON.parse(idsRaw)[0].results.map((r: { id: string }) => r.id);

const q = (v: string) => `'${v.replace(/'/g, "''")}'`;
const lines = [
  `INSERT OR REPLACE INTO terms (id, label, opens_at, closes_at, is_open) VALUES (${q(termId)}, ${q(label)}, ${q(opensAt)}, ${q(closesAt)}, 1);`,
  `DELETE FROM teacher_term_keys WHERE term_id = ${q(termId)};`,
];

async function main() {
let done = 0;
for (const teacherId of teacherIds) {
  const pair = await crypto.subtle.generateKey(KEY_ALGORITHM, true, ["sign", "verify"]);
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  lines.push(
    `INSERT INTO teacher_term_keys (teacher_id, term_id, public_key, private_key_wrapped) VALUES (${q(teacherId)}, ${q(termId)}, ${q(JSON.stringify(publicJwk))}, ${q(await wrap(privateJwk))});`,
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

console.log(`\nGenerated ${done} key pairs for term ${termId} (${remote ? "remote" : "local"}).`);
console.log("Remember: close the term to destroy the private keys.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
