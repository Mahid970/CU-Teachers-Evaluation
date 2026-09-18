"use client";

import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { type UseInViewOptions, animate, motion, useInView, useReducedMotion } from "motion/react";

/** House easing and timings — see the plan's motion rules. */
export const EASE = [0.22, 1, 0.36, 1] as const;
export const DURATION = 0.32;
export const STAGGER = 0.05;

const IN_VIEW: UseInViewOptions = { once: true, margin: "0px 0px -12% 0px" };

/**
 * Fades and lifts its children into view once. Under prefers-reduced-motion it
 * fades only, with no movement.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, IN_VIEW);
  const reduced = useReducedMotion();
  const Component = motion[as] as typeof motion.div;

  return (
    <Component
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : 12 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: DURATION, ease: EASE, delay }}
    >
      {children}
    </Component>
  );
}

/** Staggers direct children of a list. Pair with <StaggerItem>. */
export function Stagger({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, IN_VIEW);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "shown" : "hidden"}
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: STAGGER, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: reduced ? 0 : 10 },
        shown: { opacity: 1, y: 0, transition: { duration: DURATION, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Counts up to `value` when scrolled into view. The number is written straight
 * to the DOM node rather than through state, so a running count never
 * re-renders the tree around it. Reduced motion shows the final value at once.
 */
export function CountUp({
  value,
  decimals = 0,
  className,
  suffix = "",
}: {
  value: number;
  decimals?: number;
  className?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, IN_VIEW);
  const reduced = useReducedMotion();

  const format = useCallback(
    (n: number) =>
      n.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }) + suffix,
    [decimals, suffix],
  );

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!inView) {
      node.textContent = format(0);
      return;
    }
    if (reduced) {
      node.textContent = format(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.1,
      ease: EASE,
      onUpdate: (current) => {
        node.textContent = format(current);
      },
    });
    return () => {
      controls.stop();
      // If the animation is interrupted (a re-render, a route change, React's
      // double-invoked effects in development), leave the true number on
      // screen rather than whatever value it had reached.
      node.textContent = format(value);
    };
  }, [inView, reduced, value, format]);

  return (
    <span ref={ref} className={`numerals ${className ?? ""}`}>
      {format(value)}
    </span>
  );
}

/** A bar that grows from 0 to `value`/`max` when it scrolls into view. */
export function GrowBar({
  value,
  max = 5,
  delay = 0,
  tone = "evergreen",
}: {
  value: number;
  max?: number;
  delay?: number;
  tone?: "evergreen" | "amber" | "clay";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, IN_VIEW);
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color =
    tone === "amber" ? "var(--amber)" : tone === "clay" ? "var(--clay)" : "var(--evergreen)";

  return (
    <div ref={ref} className="h-2 w-full bg-paper-sunk overflow-hidden rounded-full">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={inView ? { width: `${pct}%` } : undefined}
        transition={{ duration: 0.6, ease: EASE, delay }}
      />
    </div>
  );
}

export { motion, useReducedMotion };
