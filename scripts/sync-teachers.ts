/**
 * Brings the teachers table in line with data/cu_teachers.json, safely.
 *
 *   npm run teachers:sync                    # local, report only
 *   npm run teachers:sync -- --apply         # local, make the changes
 *   npm run teachers:sync -- --remote        # production, report only
 *   npm run teachers:sync -- --remote --apply
 *
 * Then give any new teacher a signing key:
 *
 *   npm run keys:gen -- --term 2026-1 [--remote]
 *
 * Unlike the seed, this never deletes or reorders anything. Ratings are
 * permanent and point at teachers by id, and the order of a department's
 * teachers is what students' token collection is counted against:
 *   - a new teacher is added at the end of their department, with the next
 *     sequence number, so students who already collected can top up;
 *   - a changed name, designation or photo is updated in place;
 *   - a teacher missing from the source is marked inactive, never removed.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DEPARTMENTS } from "../src/lib/departments";

type ScrapedTeacher = {
  name: string;
  designation: string | null;
  employee_id: string | null;
  photo_url: string | null;
  profile_url: string | null;
};
type Scraped = { faculties: { departments: { department_name: string; teachers: ScrapedTeacher[] }[] }[] };
type Row = {
  id: string;
  name: string;
  designation: string;
  dept_slug: string;
  photo_url: string | null;
  profile_url: string | null;
  active: number;
  sort_order: number;
  added_seq: number;
};

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const apply = args.includes("--apply");
const where = remote ? "--remote" : "--local";

const root = resolve(import.meta.dirname, "..");
const data = JSON.parse(readFileSync(resolve(root, "data/cu_teachers.json"), "utf8")) as Scraped;

const unitIndex = new Map<string, ScrapedTeacher[]>();
for (const faculty of data.faculties) {
  for (const dept of faculty.departments) unitIndex.set(dept.department_name, dept.teachers);
}

// The same reading of the source as the seed: first listing wins.
const wanted = new Map<string, { t: ScrapedTeacher; slug: string }>();
for (const d of DEPARTMENTS) {
  for (const t of unitIndex.get(d.unit) ?? []) {
    const id = t.employee_id?.trim();
    if (id && !wanted.has(id)) wanted.set(id, { t, slug: d.slug });
  }
}

function query<T>(sql: string): T[] {
  const raw = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "cu-teacher-eval", where, "--json", "--command", sql],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  return JSON.parse(raw)[0].results as T[];
}

const current = query<Row>(
  "SELECT id, name, designation, dept_slug, photo_url, profile_url, active, sort_order, added_seq FROM teachers",
);
const byId = new Map(current.map((r) => [r.id, r]));
const knownSlugs = new Set(query<{ slug: string }>("SELECT slug FROM departments").map((r) => r.slug));

const q = (value: string | null | undefined) =>
  value == null ? "NULL" : `'${value.replace(/'/g, "''")}'`;

const lines: string[] = [];
const report = { added: [] as string[], updated: [] as string[], moved: [] as string[], retired: [] as string[], revived: [] as string[] };

let nextSeq = Math.max(0, ...current.map((r) => r.added_seq)) + 1;
const nextOrder = new Map<string, number>();
for (const r of current) {
  nextOrder.set(r.dept_slug, Math.max(nextOrder.get(r.dept_slug) ?? 0, r.sort_order + 1));
}

for (const [id, { t, slug }] of wanted) {
  if (!knownSlugs.has(slug)) continue; // a department not in the database yet
  const designation = t.designation ?? "Teacher";
  const existing = byId.get(id);

  if (!existing) {
    const order = nextOrder.get(slug) ?? 0;
    nextOrder.set(slug, order + 1);
    lines.push(
      `INSERT INTO teachers (id, name, designation, dept_slug, photo_url, profile_url, active, sort_order, added_seq) VALUES (${q(id)}, ${q(t.name)}, ${q(designation)}, ${q(slug)}, ${q(t.photo_url)}, ${q(t.profile_url)}, 1, ${order}, ${nextSeq});`,
    );
    report.added.push(`${t.name} (${slug}, #${nextSeq})`);
    nextSeq += 1;
    continue;
  }

  if (existing.dept_slug !== slug) {
    // Moving a teacher changes two departments' lists. Students of the old one
    // keep their token; students of the new one do not get one automatically.
    report.moved.push(`${t.name}: ${existing.dept_slug} -> ${slug} (not changed; move by hand if intended)`);
  }
  if (!existing.active) {
    lines.push(`UPDATE teachers SET active = 1 WHERE id = ${q(id)};`);
    report.revived.push(t.name);
  }
  if (
    existing.name !== t.name ||
    existing.designation !== designation ||
    existing.photo_url !== t.photo_url ||
    existing.profile_url !== t.profile_url
  ) {
    lines.push(
      `UPDATE teachers SET name = ${q(t.name)}, designation = ${q(designation)}, photo_url = ${q(t.photo_url)}, profile_url = ${q(t.profile_url)} WHERE id = ${q(id)};`,
    );
    report.updated.push(t.name);
  }
}

for (const r of current) {
  if (r.active && !wanted.has(r.id)) {
    lines.push(`UPDATE teachers SET active = 0 WHERE id = ${q(r.id)};`);
    report.retired.push(`${r.name} (${r.dept_slug})`);
  }
}

const section = (title: string, items: string[]) => {
  console.log(`\n${title}: ${items.length}`);
  for (const item of items.slice(0, 40)) console.log(`  ${item}`);
  if (items.length > 40) console.log(`  … and ${items.length - 40} more`);
};
console.log(`Teachers in the database (${remote ? "remote" : "local"}): ${current.length}`);
section("New teachers", report.added);
section("Details updated", report.updated);
section("Marked inactive (missing from the source)", report.retired);
section("Active again", report.revived);
section("Listed under a different department", report.moved);

if (lines.length === 0) {
  console.log("\nNothing to change.");
} else if (!apply) {
  console.log(`\n${lines.length} statements. Nothing written: add --apply to make these changes.`);
} else {
  const file = join(mkdtempSync(join(tmpdir(), "cu-sync-")), "sync.sql");
  writeFileSync(file, lines.join("\n"));
  execFileSync("npx", ["wrangler", "d1", "execute", "cu-teacher-eval", where, "--file", file], {
    stdio: "inherit",
  });
  console.log(`\nApplied ${lines.length} statements.`);
  if (report.added.length > 0) {
    console.log(`Now give the new teachers keys:  npm run keys:gen -- --term 2026-1${remote ? " --remote" : ""}`);
  }
}
