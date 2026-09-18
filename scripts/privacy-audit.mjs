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

for (const table of tables) {
  const rows = query(`SELECT * FROM ${table}`);
  const text = JSON.stringify(rows);
  for (const rule of forbidden) {
    // teacher_term_keys holds RSA key material, where a digit run can look like
    // an IP or a date by chance; only the identity checks apply there.
    if (table === "teacher_term_keys" && rule.label !== "the student ID") continue;
    if (rule.pattern.test(text)) {
      console.log(`FAIL  ${table} contains ${rule.label}`);
      failures += 1;
    }
  }
  console.log(`  ${rows.length === 0 ? "empty" : `${rows.length} rows`}  ${table}`);
}

console.log(
  failures === 0
    ? "\nNo identifying data found in any table."
    : `\n${failures} problem(s) found — do not deploy.`,
);
process.exit(failures === 0 ? 0 : 1);
