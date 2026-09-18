"use client";

import { motion, useReducedMotion } from "motion/react";
import { EASE } from "./motion";

const LINE_ONE = ["Rate", "your", "teachers."];
const LINE_TWO = ["Leave", "no", "trace."];

/**
 * The headline rises word by word, then a hand-drawn stroke draws itself under
 * the last line. Reduced motion shows the finished state immediately.
 */
export function HeroHeadline() {
  const reduced = useReducedMotion();

  const word = {
    hidden: { opacity: 0, y: reduced ? 0 : 14 },
    shown: { opacity: 1, y: 0 },
  };

  return (
    <h1 className="display mt-4 text-5xl sm:text-6xl lg:text-7xl">
      <motion.span
        className="block"
        initial="hidden"
        animate="shown"
        transition={{ staggerChildren: 0.06 }}
      >
        {LINE_ONE.map((w) => (
          <motion.span
            key={w}
            variants={word}
            transition={{ duration: 0.4, ease: EASE }}
            className="mr-[0.25em] inline-block"
          >
            {w}
          </motion.span>
        ))}
      </motion.span>

      <motion.span
        className="relative block text-evergreen"
        initial="hidden"
        animate="shown"
        transition={{ staggerChildren: 0.06, delayChildren: 0.18 }}
      >
        {LINE_TWO.map((w) => (
          <motion.span
            key={w}
            variants={word}
            transition={{ duration: 0.4, ease: EASE }}
            className="mr-[0.25em] inline-block"
          >
            {w}
          </motion.span>
        ))}

        <svg
          className="absolute -bottom-2 left-0 w-[7.5em] max-w-full"
          viewBox="0 0 300 12"
          fill="none"
          aria-hidden="true"
        >
          <motion.path
            d="M2 8C40 3 80 3 118 6c38 3 78 3 116-2 22-3 44-2 62 3"
            stroke="var(--amber)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: reduced ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: EASE, delay: reduced ? 0 : 0.5 }}
          />
        </svg>
      </motion.span>
    </h1>
  );
}
