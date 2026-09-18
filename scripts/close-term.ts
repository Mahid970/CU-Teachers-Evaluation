/**
 * Closes a rating term and destroys what could ever have been used against a
 * student.
 *
 *   npm run term:close -- --term 2026-1            # local
 *   npm run term:close -- --term 2026-1 --remote
 *
 * After this runs:
 *   - no new ratings are accepted for the term
 *   - the private signing keys are gone, so no further tokens can be made
 *   - the issuance rows are deleted; with the term pepper rotated away, there
 *     is nothing left that even hints at which students took part
 *
 * Ratings themselves are kept: they carry no link to any person.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const term = flag("term");
const remote = args.includes("--remote");

if (!term) {
  console.error("Usage: npm run term:close -- --term 2026-1 [--remote]");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question(
  `Close term ${term} on the ${remote ? "REMOTE" : "local"} database?\n` +
    "This destroys the signing keys and the issuance records, and cannot be undone.\n" +
    "Type the term id to confirm: ",
);
rl.close();

if (answer.trim() !== term) {
  console.log("Not confirmed; nothing was changed.");
  process.exit(1);
}

const q = (v: string) => `'${v.replace(/'/g, "''")}'`;
const sql = [
  `UPDATE terms SET is_open = 0 WHERE id = ${q(term)};`,
  `UPDATE teacher_term_keys SET private_key_wrapped = NULL WHERE term_id = ${q(term)};`,
  `DELETE FROM issuances WHERE term_id = ${q(term)};`,
].join("\n");

const file = join(mkdtempSync(join(tmpdir(), "cu-close-")), "close.sql");
writeFileSync(file, sql);

execFileSync(
  "npx",
  ["wrangler", "d1", "execute", "cu-teacher-eval", remote ? "--remote" : "--local", "--file", file],
  { stdio: "inherit" },
);

console.log(`\nTerm ${term} is closed.`);
console.log("Now rotate the pepper so old issuance hashes can never be recomputed:");
console.log("  npx wrangler secret put TERM_PEPPER");
