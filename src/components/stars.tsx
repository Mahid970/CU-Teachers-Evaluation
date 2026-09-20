"use client";

import { useId, useState } from "react";
import { Star } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

/** Read-only star row. Always paired with the numeral, never colour alone. */
export function StarRow({
  value,
  size = 16,
  showValue = true,
  className = "",
}: {
  value: number;
  size?: number;
  showValue?: boolean;
  className?: string;
}) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="inline-flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = Math.max(0, Math.min(1, rounded - i + 1));
          return (
            <span key={i} className="relative" style={{ width: size, height: size }}>
              <Star size={size} strokeWidth={1.5} className="absolute inset-0 text-hairline" />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star
                  size={size}
                  strokeWidth={1.5}
                  className="text-score"
                  fill="var(--score)"
                />
              </span>
            </span>
          );
        })}
      </span>
      {showValue && (
        <span className="numerals text-sm font-semibold">{value.toFixed(1)}</span>
      )}
      <span className="sr-only">{value.toFixed(1)} out of 5</span>
    </span>
  );
}

/**
 * Keyboard-operable star input. Arrow keys and 1-5 both work; the live region
 * announces the choice for screen readers.
 */
export function StarInput({
  name,
  label,
  value,
  onChange,
  size = 30,
}: {
  name: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  const reduced = useReducedMotion();
  const id = useId();
  const shown = hover || value;

  const set = (next: number) => {
    const clamped = Math.max(1, Math.min(5, next));
    onChange(clamped);
    if (!reduced && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(8);
    }
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={5}
      aria-valuenow={value || undefined}
      aria-valuetext={value ? `${value} of 5` : "not rated"}
      aria-describedby={id}
      className="inline-flex items-center gap-1 py-1"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          set((value || 0) + 1);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          set((value || 2) - 1);
        } else if (/^[1-5]$/.test(e.key)) {
          e.preventDefault();
          set(Number(e.key));
        }
      }}
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.button
          key={i}
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className="p-1 -m-0.5 cursor-pointer"
          onMouseEnter={() => setHover(i)}
          onFocus={() => setHover(i)}
          onClick={() => set(i)}
          whileHover={reduced ? undefined : { scale: 1.15 }}
          whileTap={reduced ? undefined : { scale: 0.92 }}
          transition={{ type: "spring", stiffness: 520, damping: 18 }}
        >
          <Star
            size={size}
            strokeWidth={1.5}
            className={i <= shown ? "text-score" : "text-hairline"}
            fill={i <= shown ? "var(--score)" : "none"}
          />
        </motion.button>
      ))}
      <input type="hidden" name={name} value={value || ""} />
      <span id={id} className="sr-only" aria-live="polite">
        {value ? `${label}: ${value} of 5` : `${label}: not rated yet`}
      </span>
    </div>
  );
}
