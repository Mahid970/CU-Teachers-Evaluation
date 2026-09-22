import type { Metadata } from "next";
import { IdDecode } from "@/components/id-decode";
import { MAX_REVIEW_LENGTH } from "@/lib/rating";

export const metadata: Metadata = {
  title: "Rating guidelines",
  description: "How to rate fairly, and how these numbers should and should not be read.",
};

export default function GuidelinesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="display text-4xl">Rating fairly</h1>

      <h2 className="display mt-12 text-3xl">Who you can rate</h2>
      <p className="mt-4 text-ink-muted">
        You never pick your department. It is read from your student ID when you
        sign in, and you are shown the teachers of that department only. The first
        five digits are all it takes.
      </p>
      <IdDecode className="mt-6" />

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
          A teacher appears with their first rating, so check how many students
          a score is based on. One or two ratings are a weak signal.
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

      <h2 className="display mt-12 text-3xl">Writing a review</h2>
      <p className="mt-4 text-ink-muted">
        You can add a short review in your own words, up to {MAX_REVIEW_LENGTH}{" "}
        characters. It is optional, and it is shown apart from your scores, so no
        one can match the two.
      </p>
      <ul className="mt-4 space-y-3 text-ink-muted">
        <li>
          Your wording can give you away. Leave out anything only you would know:
          a specific day, an incident, your seat, a conversation you had.
        </li>
        <li>
          Write about the teaching. No insults, no claims about someone&apos;s private
          life, and no names of other students or staff.
        </li>
        <li>
          Reviews that break these rules are removed, and anyone can report one
          from the teacher&apos;s page.
        </li>
      </ul>

      <h2 className="display mt-12 text-3xl">Fair use</h2>
      <p className="mt-4 text-ink-muted">
        One student, one rating per teacher, for good. You can change your rating
        whenever you like, but never add a second. Attempting to rate a teacher
        repeatedly, or rating teachers who never taught you, distorts the picture for
        everyone and is prevented technically wherever we can.
      </p>
    </div>
  );
}
