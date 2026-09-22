import { BAYESIAN_PRIOR_WEIGHT, DEFAULT_PRIOR_MEAN } from "./rating";

/**
 * Rebuilds the public aggregates from raw ratings.
 *
 * A rating updates its own teacher's numbers the moment it is saved (see
 * `rebuildTeacherStatements`), by the owner's decision in September 2026. That
 * lets a teacher see a score move right after a particular student was in the
 * room; the privacy page says so. This full rebuild still runs nightly, which
 * refreshes every teacher's weighted score against the site-wide average.
 *
 * `term_id = 'all'` holds the all-time roll-up used by the site; per-term rows
 * are kept alongside it for the term selector.
 */
export function rebuildStatsStatements(today: string): string[] {
  return [
    "DELETE FROM teacher_stats;",
    aggregate(today, "'all'", ""),
    aggregate(today, "r.term_id", ", r.term_id"),
  ];
}

/**
 * The same rebuild for one teacher, run as soon as a rating for them is saved.
 * Every statement takes the teacher's id as ?1.
 */
export function rebuildTeacherStatements(today: string): string[] {
  const only = "WHERE r.teacher_id = ?1";
  return [
    "DELETE FROM teacher_stats WHERE teacher_id = ?1;",
    aggregate(today, "'all'", "", only),
    aggregate(today, "r.term_id", ", r.term_id", only),
  ];
}

function aggregate(today: string, termExpr: string, groupTerm: string, where = "") {
  return `
INSERT INTO teacher_stats (
  teacher_id, term_id, n,
  avg_clarity, avg_knowledge, avg_punctuality, avg_fairness,
  avg_accessibility, avg_engagement, avg_overall, avg_difficulty,
  take_again_pct, bayesian_score, distribution, tag_counts, updated_on
)
SELECT
  r.teacher_id,
  ${termExpr} AS term_id,
  COUNT(*) AS n,
  AVG(r.clarity), AVG(r.knowledge), AVG(r.punctuality), AVG(r.fairness),
  AVG(r.accessibility), AVG(r.engagement), AVG(r.overall), AVG(r.difficulty),
  AVG(r.take_again) * 100.0,
  (COUNT(*) * AVG(r.overall) + ${BAYESIAN_PRIOR_WEIGHT} * COALESCE((SELECT AVG(overall) FROM ratings), ${DEFAULT_PRIOR_MEAN}))
    / (COUNT(*) + ${BAYESIAN_PRIOR_WEIGHT}) AS bayesian_score,
  '[' ||
    SUM(CASE WHEN r.overall = 1 THEN 1 ELSE 0 END) || ',' ||
    SUM(CASE WHEN r.overall = 2 THEN 1 ELSE 0 END) || ',' ||
    SUM(CASE WHEN r.overall = 3 THEN 1 ELSE 0 END) || ',' ||
    SUM(CASE WHEN r.overall = 4 THEN 1 ELSE 0 END) || ',' ||
    SUM(CASE WHEN r.overall = 5 THEN 1 ELSE 0 END) ||
  ']' AS distribution,
  '{}' AS tag_counts,
  '${today}'
FROM ratings r
${where}
GROUP BY r.teacher_id${groupTerm};`;
}
