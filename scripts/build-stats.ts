/**
 * Rebuilds teacher_stats locally (the cron does this in production).
 *   npm run stats:build           # local D1
 *   npm run stats:build -- --remote
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rebuildStatsStatements } from "../src/lib/stats-sql";

const remote = process.argv.includes("--remote");
const today = new Date().toISOString().slice(0, 10);
const sql = rebuildStatsStatements(today).join("\n");

const file = join(mkdtempSync(join(tmpdir(), "cu-stats-")), "rebuild.sql");
writeFileSync(file, sql);

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

console.log(`\nStats rebuilt (${remote ? "remote" : "local"}) for ${today}.`);
