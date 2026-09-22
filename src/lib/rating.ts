/**
 * The rating model: criteria, thresholds and the ranking maths.
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

/**
 * How many ratings a teacher needs before their numbers are shown.
 *
 * Set to 1 by the owner's decision (September 2026), so a teacher appears with
 * their first rating. The cost is known and stated on the privacy page: with
 * one or two ratings, a teacher who knows which students used the site can
 * sometimes guess who rated them. Raising this is the first lever if that
 * becomes a problem.
 */
export const MIN_RATINGS_TO_SHOW = 1;

/**
 * Written reviews.
 *
 * Free text is the most identifying thing a rating can carry, and the person
 * reading it is the one with the most context to decode it: a teacher knows who
 * missed the Thursday presentation. Two rules blunt that.
 *
 *  - Short. A cap this low leaves room for a judgement and not for an anecdote,
 *    and gives far less away than a paragraph would.
 *  - Never beside its own scores. Reviews are stored and shown apart from the
 *    numbers they came with, so a harsh line cannot be paired with a 1 out of 5.
 *
 * None of this makes free text safe. It makes it survivable. The guidance shown
 * beside the box is doing as much work as any of it.
 */
export const MAX_REVIEW_LENGTH = 400;
/** Reviews show from the first one, by the same decision as ratings above. */
export const MIN_REVIEWS_TO_SHOW = 1;

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
