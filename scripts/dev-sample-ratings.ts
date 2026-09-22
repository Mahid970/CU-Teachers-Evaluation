/**
 * DEVELOPMENT ONLY. Fills the local database with plausible ratings so the UI
 * can be judged with realistic data. Never run this against production.
 *
 *   npm run dev:sample
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { CRITERION_KEYS } from "../src/lib/rating";

if (process.argv.includes("--remote")) {
  console.error("Refusing to write sample ratings to the remote database.");
  process.exit(1);
}

const TERM = "2026-1";
const today = new Date().toISOString().slice(0, 10);

// Deterministic pseudo-random so repeated runs give a stable-looking site.
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return seed / 2 ** 32;
};

const idsRaw = execFileSync(
  "npx",
  [
    "wrangler",
    "d1",
    "execute",
    "cu-teacher-eval",
    "--local",
    "--json",
    "--command",
    "SELECT id FROM teachers",
  ],
  { encoding: "utf8" },
);
const teacherIds: string[] = JSON.parse(idsRaw)[0].results.map(
  (r: { id: string }) => r.id,
);

const lines: string[] = [
  `DELETE FROM ratings;`,
  `INSERT OR REPLACE INTO terms (id, label, opens_at, closes_at, is_open) VALUES ('${TERM}', 'Permanent', '2026-01-15', '9999-12-31', 1);`,
];

for (const teacherId of teacherIds) {
  // Roughly a fifth of teachers stay below the publication threshold, so the
  // "not enough ratings" state is visible during review.
  const count =
    rand() < 0.2 ? Math.floor(rand() * 5) : 5 + Math.floor(rand() * 60);
  const base = 2.4 + rand() * 2.4; // this teacher's underlying quality

  for (let i = 0; i < count; i += 1) {
    const score = () => {
      const v = Math.round(base + (rand() - 0.5) * 1.6);
      return Math.max(1, Math.min(5, v));
    };
    const scores = Object.fromEntries(CRITERION_KEYS.map((k) => [k, score()]));
    const overall = score();
    const difficulty = 1 + Math.floor(rand() * 5);
    const takeAgain = overall >= 4 ? 1 : overall >= 3 ? (rand() < 0.5 ? 1 : 0) : 0;
    const tokenHash = createHash("sha256")
      .update(`sample:${teacherId}:${i}`)
      .digest("hex");

    lines.push(
      `INSERT INTO ratings (token_hash, teacher_id, term_id, clarity, knowledge, punctuality, fairness, accessibility, engagement, overall, difficulty, take_again, rated_on) VALUES ('${tokenHash}', '${teacherId}', '${TERM}', ${scores.clarity}, ${scores.knowledge}, ${scores.punctuality}, ${scores.fairness}, ${scores.accessibility}, ${scores.engagement}, ${overall}, ${difficulty}, ${takeAgain}, '${today}');`,
    );
  }
}

const file = join(mkdtempSync(join(tmpdir(), "cu-sample-")), "ratings.sql");
writeFileSync(file, lines.join("\n"));

execFileSync(
  "npx",
  ["wrangler", "d1", "execute", "cu-teacher-eval", "--local", "--file", file],
  { stdio: "inherit" },
);

console.log(`\nInserted ${lines.length - 2} sample ratings across ${teacherIds.length} teachers.`);
