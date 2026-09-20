import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Corrections and removal",
  description:
    "For teachers: how to correct your details, and how removal requests are handled.",
};

export default function CorrectionsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="display text-4xl">Corrections and removal</h1>
      <p className="mt-5 text-lg text-ink-muted">
        Names, designations, departments and photographs come from the public pages of
        cu.ac.bd. If something about you is wrong or out of date, we will fix it.
      </p>

      <h2 className="display mt-12 text-3xl">What we will do</h2>
      <ul className="mt-4 space-y-3 text-ink-muted">
        <li>Correct a wrong name, spelling, designation or department.</li>
        <li>Remove your photograph on request, no reason needed.</li>
        <li>
          Remove your page entirely on request, and stop accepting ratings for you.
        </li>
        <li>
          Remove ratings that break the guidelines — for example ratings clearly aimed
          at your religion, gender or personal life rather than your teaching.
        </li>
      </ul>

      <h2 className="display mt-12 text-3xl">What we cannot do</h2>
      <ul className="mt-4 space-y-3 text-ink-muted">
        <li>
          Tell you who rated you. We do not know, and there is no record that could be
          produced under any request, however it is made.
        </li>
        <li>
          Remove individual ratings simply because they are low. Honest criticism is
          the purpose of the site.
        </li>
      </ul>

      <h2 className="display mt-12 text-3xl">How to reach us</h2>
      <p className="mt-4 text-ink-muted">
        Write from your cu.ac.bd address to the contact address published in the
        footer of this site, with your name, department, and what should change. We
        aim to reply within a week.
      </p>
      <p className="mt-6 text-sm text-ink-muted">
        Students: if you believe a rating of yours was submitted by mistake, you can
        edit it yourself from the browser that holds your tokens, until the term
        closes.
      </p>
    </div>
  );
}
