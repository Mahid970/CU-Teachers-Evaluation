import { getCloudflareContext } from "@opennextjs/cloudflare";
import { rebuildStatsStatements } from "@/lib/stats-sql";
import { todayIso } from "@/lib/server-crypto";

export const dynamic = "force-dynamic";

/**
 * Aggregate rebuild by hand, with the CRON_SECRET only.
 *
 * The nightly run is the `scheduled` handler in worker.ts, not this route, and
 * each rating already updates its own teacher. This must still never be
 * callable without the secret: a request header such as the old
 * `x-cron-trigger` is set by whoever sends the request.
 */
export async function POST(request: Request) {
  const { env: cfEnv } = await getCloudflareContext({ async: true });

  const provided = request.headers.get("x-cron-secret");
  if (!cfEnv.CRON_SECRET || provided !== cfEnv.CRON_SECRET) {
    return new Response("Not found", { status: 404 });
  }

  const statements = rebuildStatsStatements(todayIso());
  await cfEnv.DB.batch(statements.map((sql) => cfEnv.DB.prepare(sql)));

  const row = await cfEnv.DB.prepare(
    `SELECT COUNT(*) AS rows FROM teacher_stats WHERE term_id = 'all'`,
  ).first<{ rows: number }>();

  return Response.json({ ok: true, teachers: row?.rows ?? 0, rebuiltOn: todayIso() });
}
