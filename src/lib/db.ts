import { getCloudflareContext } from "@opennextjs/cloudflare";
import { MIN_RATINGS_TO_SHOW } from "./rating";

export async function db(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

export type TeacherRow = {
  id: string;
  name: string;
  designation: string;
  dept_slug: string;
  photo_url: string | null;
  profile_url: string | null;
  dept_name: string;
  faculty_key: string;
  faculty_short: string;
};

export type StatsRow = {
  n: number;
  avg_clarity: number;
  avg_knowledge: number;
  avg_punctuality: number;
  avg_fairness: number;
  avg_accessibility: number;
  avg_engagement: number;
  avg_overall: number;
  avg_difficulty: number;
  take_again_pct: number;
  bayesian_score: number;
  distribution: string;
  tag_counts: string;
};

export type TeacherWithStats = TeacherRow & {
  stats: (Omit<StatsRow, "distribution" | "tag_counts"> & {
    distribution: number[];
    tagCounts: Record<string, number>;
  }) | null;
};

const TEACHER_SELECT = `
  SELECT t.id, t.name, t.designation, t.dept_slug, t.photo_url, t.profile_url,
         d.name AS dept_name, d.faculty_key, f.short_name AS faculty_short,
         s.n, s.avg_clarity, s.avg_knowledge, s.avg_punctuality, s.avg_fairness,
         s.avg_accessibility, s.avg_engagement, s.avg_overall, s.avg_difficulty,
         s.take_again_pct, s.bayesian_score, s.distribution, s.tag_counts
  FROM teachers t
  JOIN departments d ON d.slug = t.dept_slug
  JOIN faculties f ON f.key = d.faculty_key
  LEFT JOIN teacher_stats s ON s.teacher_id = t.id AND s.term_id = 'all'
  WHERE t.active = 1`;

type JoinedRow = TeacherRow & Partial<StatsRow>;

function hydrate(row: JoinedRow): TeacherWithStats {
  const published = (row.n ?? 0) >= MIN_RATINGS_TO_SHOW;
  return {
    id: row.id,
    name: row.name,
    designation: row.designation,
    dept_slug: row.dept_slug,
    photo_url: row.photo_url,
    profile_url: row.profile_url,
    dept_name: row.dept_name,
    faculty_key: row.faculty_key,
    faculty_short: row.faculty_short,
    stats: published
      ? {
          n: row.n!,
          avg_clarity: row.avg_clarity!,
          avg_knowledge: row.avg_knowledge!,
          avg_punctuality: row.avg_punctuality!,
          avg_fairness: row.avg_fairness!,
          avg_accessibility: row.avg_accessibility!,
          avg_engagement: row.avg_engagement!,
          avg_overall: row.avg_overall!,
          avg_difficulty: row.avg_difficulty!,
          take_again_pct: row.take_again_pct!,
          bayesian_score: row.bayesian_score!,
          distribution: JSON.parse(row.distribution ?? "[0,0,0,0,0]") as number[],
          tagCounts: JSON.parse(row.tag_counts ?? "{}") as Record<string, number>,
        }
      : null,
  };
}

export async function getTeacher(id: string): Promise<TeacherWithStats | null> {
  const row = await (await db())
    .prepare(`${TEACHER_SELECT} AND t.id = ?1`)
    .bind(id)
    .first<JoinedRow>();
  return row ? hydrate(row) : null;
}

export async function getTeachersByDept(slug: string): Promise<TeacherWithStats[]> {
  const { results } = await (await db())
    .prepare(`${TEACHER_SELECT} AND t.dept_slug = ?1 ORDER BY t.sort_order`)
    .bind(slug)
    .all<JoinedRow>();
  return results.map(hydrate);
}

export async function getAllTeachers(): Promise<TeacherWithStats[]> {
  const { results } = await (await db())
    .prepare(`${TEACHER_SELECT} ORDER BY t.name`)
    .all<JoinedRow>();
  return results.map(hydrate);
}

/** Ranked teachers for the home page leaderboard and the directory. */
export async function getRankedTeachers(limit = 50): Promise<TeacherWithStats[]> {
  const { results } = await (await db())
    .prepare(
      `${TEACHER_SELECT} AND s.n >= ?1 ORDER BY s.bayesian_score DESC, s.n DESC LIMIT ?2`,
    )
    .bind(MIN_RATINGS_TO_SHOW, limit)
    .all<JoinedRow>();
  return results.map(hydrate);
}

export type SiteCounts = {
  teachers: number;
  departments: number;
  faculties: number;
  ratings: number;
};

export async function getSiteCounts(): Promise<SiteCounts> {
  const row = await (await db())
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM teachers WHERE active = 1) AS teachers,
         (SELECT COUNT(*) FROM departments) AS departments,
         (SELECT COUNT(*) FROM faculties) AS faculties,
         (SELECT COALESCE(SUM(n), 0) FROM teacher_stats WHERE term_id = 'all') AS ratings`,
    )
    .first<SiteCounts>();
  return row ?? { teachers: 0, departments: 0, faculties: 0, ratings: 0 };
}

export type DeptSummary = {
  slug: string;
  name: string;
  faculty_key: string;
  kind: string;
  teachers: number;
  rated_teachers: number;
  avg_overall: number | null;
};

export async function getDepartmentSummaries(): Promise<DeptSummary[]> {
  const { results } = await (await db())
    .prepare(
      `SELECT d.slug, d.name, d.faculty_key, d.kind,
              COUNT(t.id) AS teachers,
              SUM(CASE WHEN s.n >= ?1 THEN 1 ELSE 0 END) AS rated_teachers,
              AVG(CASE WHEN s.n >= ?1 THEN s.avg_overall END) AS avg_overall
       FROM departments d
       LEFT JOIN teachers t ON t.dept_slug = d.slug AND t.active = 1
       LEFT JOIN teacher_stats s ON s.teacher_id = t.id AND s.term_id = 'all'
       GROUP BY d.slug
       ORDER BY d.sort_order`,
    )
    .bind(MIN_RATINGS_TO_SHOW)
    .all<DeptSummary>();
  return results;
}

export async function getOpenTerm(): Promise<{ id: string; label: string } | null> {
  return (
    (await (await db())
      .prepare(`SELECT id, label FROM terms WHERE is_open = 1 ORDER BY opens_at DESC LIMIT 1`)
      .first<{ id: string; label: string }>()) ?? null
  );
}
