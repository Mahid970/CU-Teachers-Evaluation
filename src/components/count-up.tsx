"use client";

import { useEffect, useRef } from "react";

/**
 * Counts a figure up once, when it first comes into view.
 *
 * The number is written straight to the DOM node rather than through state, so
 * a running count never re-renders anything around it, and the true value is
 * what the server rendered — if the animation never runs, the correct figure is
 * already on screen.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const format = (n: number) => Math.round(n).toLocaleString("en-US");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || value === 0) {
      node.textContent = format(value);
      return;
    }

    let frame = 0;
    let start = 0;
    const duration = 900;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const step = (now: number) => {
          start ||= now;
          const progress = Math.min((now - start) / duration, 1);
          // Ease out: fast at first, settling into the real figure.
          node.textContent = format(value * (1 - Math.pow(1 - progress, 3)));
          if (progress < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {value.toLocaleString("en-US")}
    </span>
  );
}
