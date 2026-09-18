import type { Metadata } from "next";
import Link from "next/link";
import { MIN_RATINGS_TO_SHOW } from "@/lib/rating";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Exactly what this site stores, what it does not, and the limits of the protection it offers.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="section-marker">Privacy</p>
      <h1 className="display mt-2 text-5xl">What we keep, and what we cannot know</h1>
      <p className="mt-5 text-lg text-ink-muted">
        A student who rates a teacher honestly should never face consequences for it.
        The site is built so that a leak, a subpoena or a dishonest administrator
        still could not reveal who gave which rating — because that link is never
        created in the first place.
      </p>

      <h2 className="display mt-14 text-3xl">What we never store</h2>
      <ul className="mt-5 space-y-2 text-ink-muted">
        {[
          "Your email address",
          "Your student ID",
          "Your name or photo",
          "Your IP address or device details",
          "The time of day you rated (only the date is kept)",
          "Cookies or session identifiers of any kind",
          "Analytics that track individuals",
        ].map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span className="text-clay">✕</span>
            <span className="line-through">{item}</span>
          </li>
        ))}
      </ul>

      <h2 className="display mt-14 text-3xl">How a rating stays anonymous</h2>
      <ol className="mt-5 space-y-5">
        {[
          {
            title: "You sign in with Google, once per term",
            body: "We ask Google only whether your address ends in std.cu.ac.bd. Your ID tells us your department. It is held in memory for a few seconds and never written down.",
          },
          {
            title: "Your browser creates secret tokens",
            body: "For each teacher you may rate, your browser makes a random secret and hides it (a blind signature). We sign what we cannot see, so we never learn the secret.",
          },
          {
            title: "We record one fact",
            body: "That a student with a certain ID already collected their tokens this term. It is stored as a keyed hash, and the key is destroyed when the term ends, which makes even that unreadable afterwards.",
          },
          {
            title: "You rate without signing in",
            body: "A rating arrives carrying only its token. It proves you were entitled to rate that teacher, and nothing else. We cannot connect it to the sign-in that produced it — the mathematics does not allow it, and neither does our database.",
          },
        ].map((step, i) => (
          <li key={step.title} className="card p-5">
            <p className="numerals section-marker">0{i + 1}</p>
            <p className="display mt-1 text-xl">{step.title}</p>
            <p className="mt-2 text-sm text-ink-muted">{step.body}</p>
          </li>
        ))}
      </ol>

      <h2 className="display mt-14 text-3xl">Two more protections</h2>
      <p className="mt-4 text-ink-muted">
        A teacher with very few ratings could guess who wrote one, so scores stay
        hidden until a teacher has at least {MIN_RATINGS_TO_SHOW} ratings. Public
        figures are also rebuilt once a day rather than the moment a rating arrives,
        so no one can watch a number move right after a particular student was in
        the room. Your browser waits a random moment before sending, for the same
        reason.
      </p>

      <h2 className="display mt-14 text-3xl">What this does not protect against</h2>
      <p className="mt-4 text-ink-muted">
        We would rather be plain about the limits than overstate them:
      </p>
      <ul className="mt-4 space-y-3 text-ink-muted">
        <li>
          <strong className="text-ink">Your university Google account.</strong> CU
          administrators can see that you signed in to this site, as they can for any
          site you use with that account. They cannot see your ratings.
        </li>
        <li>
          <strong className="text-ink">Your own device.</strong> Anyone with your
          unlocked phone or laptop can open this site and see which teachers you have
          rated, because that list is stored in your browser.
        </li>
        <li>
          <strong className="text-ink">Very small groups.</strong> In a class of six,
          statistics alone can narrow things down. Our threshold reduces this risk but
          cannot remove it.
        </li>
      </ul>

      <h2 className="display mt-14 text-3xl">Your tokens live in your browser</h2>
      <p className="mt-4 text-ink-muted">
        Because we hold nothing about you, we cannot restore your ability to rate if
        you clear your browser data. Tokens are issued once per term — issuing them
        again would let one student rate twice. Save the backup file from{" "}
        <Link href="/me" className="text-evergreen hover:underline">
          My ratings
        </Link>{" "}
        if you might switch device.
      </p>

      <p className="mt-12 text-sm text-ink-muted">
        Questions, or want a rating removed? See{" "}
        <Link href="/corrections" className="text-evergreen hover:underline">
          corrections and removal
        </Link>
        .
      </p>
    </div>
  );
}
