/**
 * Unlinkability audit: dumps every table and fails if anything that could
 * identify a student is present.
 *
 *   node scripts/privacy-audit.mjs 24304043
 *
 * Run this after any change to the issuance or rating path. It is the check
 * that the whole privacy design rests on.
 */
import { execFileSync } from "node:child_process";

const studentId = process.argv[2] ?? "24304043";
const remote = process.argv.includes("--remote");

const query = (sql) =>
  JSON.parse(
    execFileSync(
      "npx",
      [
        "wrangler",
        "d1",
        "execute",
        "cu-teacher-eval",
        remote ? "--remote" : "--local",
        "--json",
        "--command",
        sql,
      ],
      { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
    ),
  )[0].results;

const tables = query(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf%' AND name NOT LIKE 'd1_%'",
).map((row) => row.name);

const forbidden = [
  { label: "the student ID", pattern: new RegExp(studentId) },
  { label: "an @std.cu.ac.bd address", pattern: /@std\.cu\.ac\.bd/i },
  { label: "an IP address", pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/ },
  { label: "a full timestamp", pattern: /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/ },
];

let failures = 0;
console.log(`Auditing ${tables.length} tables for ${studentId}\n`);

const dumps = new Map();

for (const table of tables) {
  const rows = query(`SELECT * FROM ${table}`);
  dumps.set(table, rows);
  const text = JSON.stringify(rows);
  for (const rule of forbidden) {
    // teacher_term_keys holds RSA key material, and vaults holds ciphertext;
    // in both, a run of digits can look like an IP or a date by chance. The
    // identity checks still apply — those must never match anywhere.
    if (
      (table === "teacher_term_keys" || table === "vaults") &&
      rule.label !== "the student ID"
    ) {
      continue;
    }
    if (rule.pattern.test(text)) {
      console.log(`FAIL  ${table} contains ${rule.label}`);
      failures += 1;
    }
  }
  console.log(`  ${rows.length === 0 ? "empty" : `${rows.length} rows`}  ${table}`);
}

/* ---- Structural checks: the shape has to hold, not just the contents ---- */

console.log("");

/**
 * A rating and a review are carried by the same token but filed under
 * different hashes of it. If any value ever appeared in both tables, the two
 * could be joined and a sentence could be read next to its scores.
 */
const ratingKeys = new Set((dumps.get("ratings") ?? []).map((r) => r.token_hash));
const reviewKeys = new Set((dumps.get("reviews") ?? []).map((r) => r.review_hash));
const shared = [...reviewKeys].filter((key) => ratingKeys.has(key));
if (shared.length > 0) {
  console.log(`FAIL  ratings and reviews share ${shared.length} key(s)`);
  failures += 1;
} else {
  console.log(`  ok    ratings and reviews share no key (${ratingKeys.size} / ${reviewKeys.size})`);
}

/**
 * The vault is only ever ciphertext. If a bundle were ever stored unwrapped,
 * the token strings inside it would join straight to the ratings table.
 */
const vaultText = JSON.stringify(dumps.get("vaults") ?? []);
if (/"tokens"|"teacherId"|"prepared"|"signature"/.test(vaultText)) {
  console.log("FAIL  vaults contains a readable token bundle");
  failures += 1;
} else {
  console.log(`  ok    vaults holds only ciphertext (${(dumps.get("vaults") ?? []).length} rows)`);
}

/**
 * Issuance says a student collected tokens; nothing else may. If a vault
 * lookup were ever stored beside a student hash, the two would be joinable.
 */
const issuanceHashes = new Set(
  (dumps.get("issuances") ?? []).map((r) => r.student_hmac),
);
const vaultLookups = new Set((dumps.get("vaults") ?? []).map((r) => r.lookup));
const crossed = [...vaultLookups].filter((key) => issuanceHashes.has(key));
if (crossed.length > 0) {
  console.log(`FAIL  a vault lookup matches an issuance hash (${crossed.length})`);
  failures += 1;
} else {
  console.log("  ok    vault lookups and issuance hashes are disjoint");
}

console.log(
  failures === 0
    ? "\nNo identifying data, and no table joins a person to a rating."
    : `\n${failures} problem(s) found — do not deploy.`,
);
process.exit(failures === 0 ? 0 : 1);
