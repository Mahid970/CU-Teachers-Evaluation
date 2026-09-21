/**
 * The rating model: criteria, tags, thresholds and the ranking maths.
 */

export const CRITERIA = [
  { key: "clarity", label: "Teaching clarity", hint: "Explains concepts clearly" },
  { key: "knowledge", label: "Knowledge & preparation", hint: "Commands the subject, comes prepared" },
  { key: "punctuality", label: "Punctuality", hint: "Holds classes on time and regularly" },
  { key: "fairness", label: "Fair assessment", hint: "Marks fairly, returns scripts and feedback" },
  { key: "accessibility", label: "Accessibility", hint: "Approachable outside class" },
  { key: "engagement", label: "Engagement", hint: "Encourages questions and participation" },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]["key"];
export const CRITERION_KEYS = CRITERIA.map((c) => c.key) as CriterionKey[];

/** Fixed tag list. Free text is deliberately not collected — see the privacy page. */
export const TAGS = [
  { key: "clear-slides", label: "Clear slides" },
  { key: "good-feedback", label: "Gives good feedback" },
  { key: "inspiring", label: "Inspiring" },
  { key: "helpful-outside-class", label: "Helpful outside class" },
  { key: "exam-focused", label: "Exam focused" },
  { key: "heavy-assignments", label: "Heavy assignments" },
  { key: "tough-grader", label: "Tough grader" },
  { key: "strict-attendance", label: "Strict attendance" },
  { key: "often-late", label: "Often late" },
  { key: "reads-from-slides", label: "Reads from slides" },
] as const;

export type TagKey = (typeof TAGS)[number]["key"];
export const TAG_KEYS = TAGS.map((t) => t.key) as TagKey[];
export const MAX_TAGS = 3;

/**
 * A teacher's numbers stay hidden until this many ratings exist, so that a
 * teacher cannot work out who rated them from a handful of responses.
 */
export const MIN_RATINGS_TO_SHOW = 5;

/**
 * Written reviews.
 *
 * Free text is the most identifying thing a rating can carry, and the person
 * reading it is the one with the most context to decode it: a teacher knows who
 * missed the Thursday presentation. Three rules blunt that.
 *
 *  - Short. A cap this low leaves room for a judgement and not for an anecdote,
 *    and gives far less away than a paragraph would.
 *  - Never alone. Nothing is published until several students have written, so
 *    a single review can never be the one that appeared after one conversation.
 *  - Never beside its own scores. Reviews are stored and shown apart from the
 *    numbers they came with, so a harsh line cannot be paired with a 1 out of 5.
 *
 * None of this makes free text safe. It makes it survivable. The guidance shown
 * beside the box is doing as much work as any of it.
 */
export const MAX_REVIEW_LENGTH = 400;
export const MIN_REVIEWS_TO_SHOW = 5;

/** Prior weight for the Bayesian average (in units of ratings). */
export const BAYESIAN_PRIOR_WEIGHT = 5;
/** Fallback prior mean before the site has enough data of its own. */
export const DEFAULT_PRIOR_MEAN = 3.5;

export type Scores = Record<CriterionKey, number> & {
  overall: number;
  difficulty: number;
};

/**
 * Bayesian average: pulls small samples towards the site-wide mean so that a
 * teacher with three 5.0s does not outrank one with eighty 4.8s.
 */
export function bayesianScore(
  count: number,
  average: number,
  priorMean: number = DEFAULT_PRIOR_MEAN,
  priorWeight: number = BAYESIAN_PRIOR_WEIGHT,
): number {
  if (count <= 0) return priorMean;
  return (count * average + priorWeight * priorMean) / (count + priorWeight);
}

export function isPublishable(count: number): boolean {
  return count >= MIN_RATINGS_TO_SHOW;
}

/** 1-5 integer check used by both the API and the form. */
export function isValidScore(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}
