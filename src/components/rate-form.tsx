"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, PenLine } from "lucide-react";
import { motion } from "motion/react";
import { StarInput } from "./stars";
import {
  CRITERIA,
  type CriterionKey,
  MAX_REVIEW_LENGTH,
  MAX_TAGS,
  TAGS,
} from "@/lib/rating";
import {
  LAST_TERM_KEY,
  type TokenBundle,
  bundleKey,
  markRated,
} from "@/lib/tokens-client";
import { syncVault } from "@/lib/vault";
import { useStoredValue } from "@/lib/use-local-storage";

type Scores = Record<CriterionKey | "overall" | "difficulty", number>;

const EMPTY: Scores = {
  clarity: 0,
  knowledge: 0,
  punctuality: 0,
  fairness: 0,
  accessibility: 0,
  engagement: 0,
  overall: 0,
  difficulty: 0,
};

/** Random pause before the rating is sent, so the moment of sign-in and the
 *  moment of submission cannot be lined up by anyone watching. */
const MAX_DELAY_MS = 90_000;

export function RateForm({ teacherId, teacherName }: { teacherId: string; teacherName: string }) {
  const term = useStoredValue(LAST_TERM_KEY);
  const rawBundle = useStoredValue(term ? bundleKey(term) : "cu_eval_none");
  const bundle = useMemo<TokenBundle | null>(
    () => (rawBundle ? (JSON.parse(rawBundle) as TokenBundle) : null),
    [rawBundle],
  );
  const token = bundle?.tokens.find((t) => t.teacherId === teacherId) ?? null;

  const [scores, setScores] = useState<Scores>(EMPTY);
  const [takeAgain, setTakeAgain] = useState<boolean | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [review, setReview] = useState("");
  const [stage, setStage] = useState<"form" | "sending" | "sent" | "error">("form");
  const [message, setMessage] = useState("");

  const missing = [
    ...CRITERIA.filter((c) => !scores[c.key]).map((c) => c.label),
    ...(scores.overall ? [] : ["Overall"]),
    ...(scores.difficulty ? [] : ["Difficulty"]),
    ...(takeAgain === null ? ["Would you take their course again"] : []),
  ];

  async function submit() {
    if (!token || missing.length > 0) return;
    setStage("sending");

    const delay = Math.floor(Math.random() * MAX_DELAY_MS);
    await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 2500)));

    try {
      const response = await fetch("/api/rate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          teacherId,
          prepared: token.prepared,
          signature: token.signature,
          scores,
          takeAgain: takeAgain ?? false,
          tags,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "That rating was not accepted.");

      // The review goes in a request of its own, keyed by a different hash of
      // the same token. Sending both together would put the sentence and the
      // scores in one place, which is exactly what is being avoided.
      if (review.trim().length > 0) {
        await fetch("/api/review", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            teacherId,
            prepared: token.prepared,
            signature: token.signature,
            body: review,
          }),
        }).catch(() => {
          // The scores are in. A failed review must not lose them.
        });
      }

      if (bundle) {
        markRated(bundle.term, teacherId);
        // Carries the progress to the student's other devices, if this tab has
        // been unlocked. Silent, and never blocking.
        void syncVault(bundle.term);
      }
      setStage("sent");
    } catch (error) {
      setStage("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  if (!token) {
    return (
      <div className="panel mt-10 p-7">
        <p className="display text-2xl">You need a token for this teacher</p>
        <p className="mt-2 text-sm text-ink-muted">
          Tokens are handed out once per term, per student, for the teachers of your
          own department. Verify with your CU Google account, or restore your backup
          if you have switched browser.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/verify" className="btn btn-primary">Verify with Google</Link>
          <Link href="/me" className="btn btn-quiet">Restore a backup</Link>
        </div>
      </div>
    );
  }

  if (stage === "sent") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] as const }}
        className="panel relative mt-10 p-8"
      >
        <motion.span
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] as const, delay: 0.1 }}
          className="absolute -top-3 right-6 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-surface"
        >
          Recorded
        </motion.span>
        <p className="display text-3xl">Thank you</p>
        <p className="mt-3 text-sm text-ink-muted">
          Your rating of {teacherName} is stored with no link to you. It appears in the
          public figures at the next daily update, so no one can tell when it arrived.
          You can change it from this browser until the term closes.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/me" className="btn btn-primary">Rate another teacher</Link>
          <Link href={`/t/${teacherId}`} className="btn btn-quiet">See this teacher&apos;s page</Link>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mt-10">
      <div className="panel p-6 sm:p-7">
        <h2 className="display text-xl">Rate each of these</h2>

        <ul className="mt-5 space-y-6">
          {CRITERIA.map((criterion) => (
            <li key={criterion.key} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{criterion.label}</p>
                <p className="text-xs text-ink-muted">{criterion.hint}</p>
              </div>
              <StarInput
                name={criterion.key}
                label={criterion.label}
                value={scores[criterion.key]}
                onChange={(v) => setScores((s) => ({ ...s, [criterion.key]: v }))}
              />
            </li>
          ))}
        </ul>

        <hr className="hairline my-6" />

        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">Overall</p>
              <p className="text-xs text-ink-muted">Your general impression as a teacher</p>
            </div>
            <StarInput
              name="overall"
              label="Overall"
              value={scores.overall}
              onChange={(v) => setScores((s) => ({ ...s, overall: v }))}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">Difficulty</p>
              <p className="text-xs text-ink-muted">
                How demanding the course is. This is shown separately, not as good or bad.
              </p>
            </div>
            <StarInput
              name="difficulty"
              label="Difficulty"
              value={scores.difficulty}
              onChange={(v) => setScores((s) => ({ ...s, difficulty: v }))}
            />
          </div>

          <fieldset>
            <legend className="font-medium">Would you take their course again?</legend>
            <div className="mt-3 flex gap-2">
              {[
                { label: "Yes", value: true },
                { label: "No", value: false },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={takeAgain === option.value}
                  onClick={() => setTakeAgain(option.value)}
                  className={`border px-5 py-2 text-sm transition-colors ${
                    takeAgain === option.value
                      ? "border-brand bg-brand text-paper-raised"
                      : "border-hairline hover:border-brand"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-medium">
              Tags <span className="font-normal text-ink-muted">(up to {MAX_TAGS}, optional)</span>
            </legend>
            <p className="mt-1 text-xs text-ink-muted">
              A fixed list, so these can be counted across everyone who rated.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {TAGS.map((tag) => {
                const active = tags.includes(tag.key);
                return (
                  <button
                    key={tag.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setTags((current) =>
                        active
                          ? current.filter((t) => t !== tag.key)
                          : current.length >= MAX_TAGS
                            ? current
                            : [...current, tag.key],
                      )
                    }
                    className={`chip transition-colors ${
                      active ? "!border-brand !bg-brand text-paper-raised" : ""
                    }`}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="flex items-center gap-2 font-medium">
              <PenLine size={16} strokeWidth={1.75} className="text-brand" aria-hidden="true" />
              In your own words
              <span className="font-normal text-ink-muted">(optional)</span>
            </legend>
            <p className="prose-measure mt-1 text-xs text-ink-muted">
              Write about the teaching, not about you. Anything that points at a
              particular class, a particular assignment or a particular argument
              can identify you to the one person who already knows what happened.
              Reviews appear only once several students have written one, and are
              never shown next to the scores they came with.
            </p>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value.slice(0, MAX_REVIEW_LENGTH))}
              rows={4}
              maxLength={MAX_REVIEW_LENGTH}
              placeholder="Explains difficult topics patiently and marks fairly."
              className="field mt-3 resize-y"
              aria-describedby="review-count"
            />
            <p
              id="review-count"
              className="numerals mt-1 text-right text-xs text-ink-muted"
              aria-live="polite"
            >
              {review.length} / {MAX_REVIEW_LENGTH}
            </p>
          </fieldset>
        </div>
      </div>

      {stage === "error" && (
        <p className="mt-4 flex items-start gap-2 text-sm text-low">
          <AlertCircle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          {message}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          className="btn btn-primary disabled:opacity-50"
          disabled={missing.length > 0 || stage === "sending"}
          onClick={() => void submit()}
        >
          {stage === "sending" ? (
            <>
              <Loader2 size={18} strokeWidth={1.5} className="animate-spin" />
              Sending
            </>
          ) : (
            "Submit rating"
          )}
        </button>
        {missing.length > 0 && (
          <p className="text-xs text-ink-muted">Still to do: {missing.join(", ")}</p>
        )}
      </div>

      <p className="mt-5 text-xs text-ink-muted">
        Submissions are held for a random moment before sending and are stored with the
        date only, so the time you rated cannot be matched to the time you signed in.
      </p>
    </div>
  );
}
