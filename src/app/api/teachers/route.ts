import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Public teacher names for a list of ids, used by the local-only /me page.
 * Read-only, and the ids come from the visitor's own browser.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^[A-Za-z0-9_-]{1,32}$/.test(id))
    .slice(0, 300);

  if (ids.length === 0) return Response.json({ teachers: [] });

  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB;

  const { results } = await db
    .prepare(
      `SELECT t.id, t.name, t.designation, d.name AS deptName
       FROM teachers t JOIN departments d ON d.slug = t.dept_slug
       WHERE t.id IN (${ids.map(() => "?").join(",")})`,
    )
    .bind(...ids)
    .all();

  return Response.json(
    { teachers: results },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}
