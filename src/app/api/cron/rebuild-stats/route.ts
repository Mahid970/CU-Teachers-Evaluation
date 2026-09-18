import { getCloudflareContext } from "@opennextjs/cloudflare";
import { rebuildStatsStatements } from "@/lib/stats-sql";
import { todayIso } from "@/lib/server-crypto";

export const dynamic = "force-dynamic";

/**
 * Daily aggregate rebuild, triggered by the Workers cron (see wrangler.jsonc).
 *
 * Public numbers move once a day rather than on every write, so a teacher
 * cannot match a change in their score to a particular student's visit.
 *
 * Also callable by hand with the CRON_SECRET, for the first run of a term.
 */
export async function POST(request: Request) {
  const { env: cfEnv } = await getCloudflareContext({ async: true });

  const provided = request.headers.get("x-cron-secret");
  const isCron = request.headers.get("x-cron-trigger") === "1";
  if (!isCron && (!cfEnv.CRON_SECRET || provided !== cfEnv.CRON_SECRET)) {
    return new Response("Not found", { status: 404 });
  }

  const statements = rebuildStatsStatements(todayIso());
  await cfEnv.DB.batch(statements.map((sql) => cfEnv.DB.prepare(sql)));

  const row = await cfEnv.DB.prepare(
    `SELECT COUNT(*) AS rows FROM teacher_stats WHERE term_id = 'all'`,
  ).first<{ rows: number }>();

  return Response.json({ ok: true, teachers: row?.rows ?? 0, rebuiltOn: todayIso() });
}
