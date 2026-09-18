import type { Metadata } from "next";
import { MIN_RATINGS_TO_SHOW } from "@/lib/rating";

export const metadata: Metadata = {
  title: "Rating guidelines",
  description: "How to rate fairly, and how these numbers should and should not be read.",
};

export default function GuidelinesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="section-marker">Guidelines</p>
      <h1 className="display mt-2 text-5xl">Rating fairly</h1>

      <h2 className="display mt-12 text-3xl">Before you rate</h2>
      <ul className="mt-4 space-y-3 text-ink-muted">
        <li>Rate teachers who have actually taught you, on what happened in class.</li>
        <li>
          Rate the teaching, not the person. Their appearance, gender, religion,
          politics, accent or personal life have nothing to do with it.
        </li>
        <li>
          A hard course is not a bad teacher. That is why difficulty is a separate
          question and is never counted as good or bad.
        </li>
        <li>A grade you did not like is not, by itself, unfair assessment.</li>
      </ul>

      <h2 className="display mt-12 text-3xl">How to read the numbers</h2>
      <ul className="mt-4 space-y-3 text-ink-muted">
        <li>
          Ratings appear only once a teacher has {MIN_RATINGS_TO_SHOW} of them, and a
          score based on six ratings is still a weak signal.
        </li>
        <li>
          Rankings use a weighted average, so a teacher with three perfect scores does
          not leap over one with eighty strong ones.
        </li>
        <li>
          Students who feel strongly are likelier to rate. Treat these numbers as
          impressions from some students, not a measurement of teaching quality.
        </li>
        <li>
          This is not an official evaluation and carries no weight in any university
          process.
        </li>
      </ul>

      <h2 className="display mt-12 text-3xl">Why there are no written comments</h2>
      <p className="mt-4 text-ink-muted">
        Free text is the fastest way to identify the person who wrote it: phrasing,
        spelling and the incident described can all point at one student. It also
        attracts abuse and defamation. Fixed tags keep the useful signal without
        putting anyone at risk.
      </p>

      <h2 className="display mt-12 text-3xl">Fair use</h2>
      <p className="mt-4 text-ink-muted">
        One student, one rating per teacher, per term. Attempting to rate a teacher
        repeatedly, or rating teachers who never taught you, distorts the picture for
        everyone and is prevented technically wherever we can.
      </p>
    </div>
  );
}
