"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The hero: an invitation to try to break the anonymity promise.
 *
 * A student's rating is carried by a token that the server signed without ever
 * seeing it, so once the token is spent it looks exactly like everyone else's.
 * Saying that is easy to disbelieve. Here you can point at your own token, watch
 * the pool shuffle, and fail to follow it — which is the whole claim, made in a
 * form a person can check for themselves rather than take on trust.
 *
 * Motion only ever runs in answer to a click, and reduced motion skips straight
 * to the outcome.
 */

const COLUMNS = 5;
const ROWS = 3;
const COUNT = COLUMNS * ROWS;
const CELL = 46;
const GAP = 10;

/** Which token is the reader's, before anything is shuffled. */
const MINE = 7;

type Phase = "idle" | "marked" | "shuffling" | "lost";

const CAPTIONS: Record<Phase, { text: string; action: string }> = {
  idle: {
    text: "Every rating here is carried by a token the server signed without being able to read it. Yours is in this pool.",
    action: "Show me mine",
  },
  marked: {
    text: "That one is yours. Keep your eye on it.",
    action: "Shuffle",
  },
  shuffling: {
    text: "Shuffling…",
    action: "Shuffle",
  },
  lost: {
    text: "Gone. You cannot tell which one it was, and neither can we. There is nothing in the token that points back to you.",
    action: "Try again",
  },
};

function cellPosition(index: number) {
  return {
    x: (index % COLUMNS) * (CELL + GAP),
    y: Math.floor(index / COLUMNS) * (CELL + GAP),
  };
}

/** A deterministic shuffle, so the pool never lands back where it started. */
function shuffledOrder(seed: number): number[] {
  const order = Array.from({ length: COUNT }, (_, i) => i);
  let random = seed;
  for (let i = order.length - 1; i > 0; i -= 1) {
    random = (random * 1664525 + 1013904223) % 2 ** 32;
    const j = random % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function TokenPool() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [showMark, setShowMark] = useState(false);
  const [order, setOrder] = useState(() => Array.from({ length: COUNT }, (_, i) => i));
  const [round, setRound] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const after = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  function advance() {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (phase === "idle") {
      setPhase("marked");
      setShowMark(true);
      return;
    }

    if (phase === "lost") {
      setOrder(Array.from({ length: COUNT }, (_, i) => i));
      setPhase("idle");
      setShowMark(false);
      return;
    }

    setPhase("shuffling");
    setOrder(shuffledOrder(round + 1));
    setRound((n) => n + 1);

    if (reduced) {
      setShowMark(false);
      setPhase("lost");
      return;
    }

    // The mark dissolves while everything is still moving. Letting it survive
    // the shuffle would make this a hiding trick; losing it mid-motion is what
    // actually happens to a token once it is signed and spent.
    after(190, () => setShowMark(false));
    after(820, () => setPhase("lost"));
  }

  const caption = CAPTIONS[phase];

  return (
    <div>
      <div
        className="relative mx-auto"
        style={{
          width: COLUMNS * CELL + (COLUMNS - 1) * GAP,
          height: ROWS * CELL + (ROWS - 1) * GAP,
        }}
      >
        {order.map((target, index) => {
          const from = cellPosition(index);
          const to = cellPosition(target);
          const isMine = index === MINE;
          return (
            <div
              key={index}
              className="token"
              data-mine={isMine && showMark ? "true" : undefined}
              style={{
                left: from.x,
                top: from.y,
                width: CELL,
                height: CELL,
                transform: `translate(${to.x - from.x}px, ${to.y - from.y}px)`,
                // Each token leaves at a slightly different moment, so the pool
                // moves like a crowd rather than a single block.
                transitionDelay: `${(index % COLUMNS) * 18}ms`,
              }}
            />
          );
        })}
      </div>

      <p
        className="mt-5 min-h-[3.5rem] text-sm text-ink-muted"
        aria-live="polite"
      >
        {caption.text}
      </p>

      <button type="button" onClick={advance} className="btn btn-quiet mt-1 w-full">
        {caption.action}
      </button>
    </div>
  );
}
