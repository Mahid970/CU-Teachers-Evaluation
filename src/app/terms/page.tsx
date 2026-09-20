import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms of use for this student-run teacher evaluation site.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="display text-4xl">Terms of use</h1>

      <h2 className="display mt-12 text-3xl">What this site is</h2>
      <p className="mt-4 text-ink-muted">
        An independent project run by students of the University of Chittagong. It is
        not an official university website, and it is not affiliated with or endorsed
        by the university. Ratings are the opinions of individual students, not
        statements of fact, and carry no official weight.
      </p>

      <h2 className="display mt-12 text-3xl">Who may rate</h2>
      <p className="mt-4 text-ink-muted">
        Current students with an @std.cu.ac.bd account, rating teachers of their own
        department, once per teacher per term. Attempting to bypass that limit, to
        automate ratings, or to submit ratings for teachers who never taught you is a
        misuse of the site.
      </p>

      <h2 className="display mt-12 text-3xl">Content</h2>
      <p className="mt-4 text-ink-muted">
        Ratings are numeric, with a fixed set of tags; there is no free text. We remove
        ratings that breach the{" "}
        <Link href="/guidelines" className="text-brand hover:underline">
          guidelines
        </Link>
        , and we correct or remove teacher details on request — see{" "}
        <Link href="/corrections" className="text-brand hover:underline">
          corrections and removal
        </Link>
        .
      </p>

      <h2 className="display mt-12 text-3xl">No warranty</h2>
      <p className="mt-4 text-ink-muted">
        The site is provided as is. Numbers may be incomplete, out of date, or skewed
        by who chose to rate. Do not rely on them for any decision that matters without
        seeking other views.
      </p>

      <h2 className="display mt-12 text-3xl">Your data</h2>
      <p className="mt-4 text-ink-muted">
        We hold no personal data about raters, by design. See the{" "}
        <Link href="/privacy" className="text-brand hover:underline">
          privacy page
        </Link>{" "}
        for exactly what is stored and what the limits of that protection are.
      </p>
    </div>
  );
}
