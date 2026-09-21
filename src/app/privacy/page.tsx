import type { Metadata } from "next";
import Link from "next/link";
import { X } from "lucide-react";
import { TokenPool } from "@/components/token-pool";
import { MIN_RATINGS_TO_SHOW, MIN_REVIEWS_TO_SHOW } from "@/lib/rating";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Exactly what this site stores, what it does not, and the limits of the protection it offers.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="display text-4xl">What we keep, and what we cannot know</h1>
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
            <span className="ledger-cross" aria-hidden="true">
              <X size={13} strokeWidth={2.5} />
            </span>
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
          <li key={step.title} className="panel p-5">
            <span className="score text-sm text-ink-muted">{i + 1}</span>
            <p className="display mt-1 text-xl">{step.title}</p>
            <p className="mt-2 text-sm text-ink-muted">{step.body}</p>
          </li>
        ))}
      </ol>

      <div className="panel mt-10 p-5 sm:p-6">
        <h3 className="display text-xl">See for yourself</h3>
        <p className="prose-measure mt-2 mb-5 text-sm text-ink-muted">
          Every rating is carried by a token the server signed without being able
          to read it. Mark one as yours, shuffle the pool, and try to follow it.
        </p>
        <TokenPool />
      </div>

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
        <li>
          <strong className="text-ink">A weak passphrase.</strong> Your encrypted
          tokens are protected by the words you chose. We make each guess expensive
          and a leaked database alone cannot be attacked at all — but a passphrase
          someone could guess is worth less than one they could not. Before the
          vault existed, this link did not exist in any form; now it exists as
          ciphertext, and that is a real change we would rather state than bury.
        </li>
        <li>
          <strong className="text-ink">Anything you write.</strong> A written
          review can identify you no matter what we do with it, if it describes
          something only you and your teacher know about.
        </li>
        <li>
          <strong className="text-ink">Us.</strong> This site serves you the code
          that does the encrypting. A version that quietly kept your passphrase
          would look identical from outside. That has always been true of the
          rating page; it is worth saying now that it guards something stored.
        </li>
      </ul>

      <h2 className="display mt-14 text-3xl">Rating from more than one device</h2>
      <p className="prose-measure mt-4 text-ink-muted">
        Tokens are issued once per term, because issuing them twice would let one
        student rate twice. They live in the browser that collected them, which
        used to mean one device and no way back if you cleared it.
      </p>
      <p className="prose-measure mt-4 text-ink-muted">
        You can now keep an encrypted copy with us instead. Choose a passphrase
        and your browser derives a key from it, encrypts your tokens, and uploads
        only the result. Signing in on a laptop and typing the same words brings
        them back.
      </p>
      <p className="prose-measure mt-4 text-ink-muted">
        Signing in with your email alone could never do this. If we could hand
        your tokens back on proof of your address, we would be holding your
        tokens — and your tokens are what your ratings are filed under. One join
        and we would know what you said. The passphrase is the part we never see,
        and it is what keeps that join impossible.
      </p>
      <p className="prose-measure mt-4 text-ink-muted">
        The stored copy is not even filed under your name. Its label is derived
        in your browser from your student ID <em>and</em> your passphrase
        together, so without the passphrase the row cannot be read and cannot be
        attributed to anyone. It is wrapped a second time with a key that is not
        in the database, so a leaked copy of the database offers nothing to guess
        against.
      </p>
      <p className="prose-measure mt-4 text-ink-muted">
        <strong className="text-ink">There is no reset.</strong> A reset would
        mean we could open your vault ourselves, which is the whole thing this
        avoids. If you would rather not rely on remembering, save the backup file
        from{" "}
        <Link href="/me" className="text-brand hover:underline">
          My ratings
        </Link>{" "}
        as well.
      </p>

      <h2 className="display mt-14 text-3xl">Written reviews</h2>
      <p className="prose-measure mt-4 text-ink-muted">
        You can write a few sentences alongside your scores. Be careful with
        them: free text is the most identifying thing a rating can carry, and the
        person reading it is the one with the most context to work out who wrote
        it. A teacher knows who missed the Thursday presentation.
      </p>
      <p className="prose-measure mt-4 text-ink-muted">
        Three things blunt that. Reviews are short by design. None appear until{" "}
        {MIN_REVIEWS_TO_SHOW} students have written one, so a review is never the
        only one on a page. And a review is never stored beside the scores it
        came with — it arrives in a separate request, is filed under a different
        value, and sits in a table that shares no key with the ratings. Nobody
        reading our database, including us, can put a sentence next to the number
        it arrived with.
      </p>
      <p className="prose-measure mt-4 text-ink-muted">
        None of that makes free text safe. It makes it survivable. Write about
        the teaching, not about a particular class, a particular mark or a
        particular argument.
      </p>

      <p className="mt-12 text-sm text-ink-muted">
        Questions, or want a rating removed? See{" "}
        <Link href="/corrections" className="text-brand hover:underline">
          corrections and removal
        </Link>
        .
      </p>
    </div>
  );
}
