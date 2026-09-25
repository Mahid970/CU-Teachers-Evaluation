"use client";

import { useEffect, useRef, useState } from "react";
import type { DemoTeacher } from "@/lib/db";
import { TeacherAvatar } from "./teacher-card";

/**
 * A rating being given, over and over, to real teachers from the directory.
 *
 * The hero has to say what this site is in one glance: someone taps stars for a
 * teacher, writes a line, sends it, and leaves nothing behind. A pointer does
 * the tapping, because a card that fills itself in reads as a screenshot rather
 * than as something a student does.
 *
 * The teachers are real, with their own photo, department and score, and those
 * figures never move: the card is marked as an example, and a rating that did
 * not happen is never shown as having happened. Three cards take turns, so the
 * deck behind the front one is real too.
 *
 * Plain elements on one CSS timeline of three ten-second turns, animating
 * opacity, transform and a couple of offsets. The map that used to sit here was
 * four hundred SVG paths repainting every frame, which is what made scrolling
 * stutter on a phone. It holds still while off screen, while the tab is hidden
 * and while the page scrolls.
 */

const CRITERIA = [
  { label: "Teaching clarity", stars: 5 },
  { label: "Fair assessment", stars: 4 },
  { label: "Punctuality", stars: 5 },
  { label: "Accessibility", stars: 4 },
];

/** Typed into the review box. General on purpose: an example, not a verdict. */
const REVIEW = "Explains clearly and marks fairly.";

/** What a rating leaves behind, and what it does not. */
const TRACE = [
  { label: "Email", kept: false },
  { label: "Name", kept: false },
  { label: "IP address", kept: false },
  { label: "The date", kept: true },
];

export function RatingDemo({ teachers }: { teachers: DemoTeacher[] }) {
  const frame = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  /**
   * Where the pointer taps, measured rather than guessed.
   *
   * The stars are a fixed size against the right edge and the rows are spread
   * down a card whose height follows the column, so no percentage lands on them
   * at every width. These are read from the front card once, and again whenever
   * it is resized.
   */
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const card = node.querySelector<HTMLElement>(".demo-card");
    if (!card) return;

    const measure = () => {
      const box = card.getBoundingClientRect();
      if (box.width === 0) return;
      const point = (el: Element | null | undefined, i: number) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        node.style.setProperty(`--tap-${i}-x`, `${r.left + r.width / 2 - box.left}px`);
        node.style.setProperty(`--tap-${i}-y`, `${r.top + r.height / 2 - box.top}px`);
      };
      card.querySelectorAll(".demo-criteria li").forEach((row, i) => {
        const lit = row.querySelectorAll(".demo-star[data-on]");
        point(lit[lit.length - 1], i + 1);
      });
      point(card.querySelector(".demo-review"), 5);
      point(card.querySelector(".demo-button"), 6);
      node.style.setProperty("--card-h", `${box.height}px`);
    };

    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(card);
    return () => resize.disconnect();
  }, []);

  useEffect(() => {
    const node = frame.current;
    if (!node) return;

    let offScreen = false;
    let hidden = document.visibilityState !== "visible";
    let scrolling = false;
    const apply = () => setPaused(offScreen || hidden || scrolling);

    const observer = new IntersectionObserver(([entry]) => {
      offScreen = !entry.isIntersecting;
      apply();
    });
    observer.observe(node);

    const onVisibility = () => {
      hidden = document.visibilityState !== "visible";
      apply();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // One change when scrolling starts and one when it settles, never one per
    // scroll event.
    let settle: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      if (!scrolling) {
        scrolling = true;
        apply();
      }
      clearTimeout(settle);
      settle = setTimeout(() => {
        scrolling = false;
        apply();
      }, 400);
    };
    addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      removeEventListener("scroll", onScroll);
      clearTimeout(settle);
    };
  }, []);

  if (teachers.length === 0) return null;

  return (
    <div
      ref={frame}
      className="rating-demo w-full"
      data-paused={paused ? "true" : undefined}
      aria-hidden="true"
    >
      {/* Says plainly that the rating being given is a demonstration, so
          nothing on a real teacher's card reads as something that happened. */}
      <span className="demo-example">Example</span>

      <div className="demo-stack">
        {teachers.slice(0, 3).map((teacher, slot) => (
          <div
            key={teacher.id}
            className="demo-card"
            style={{ "--slot": slot } as React.CSSProperties}
          >
            <span className="demo-flight">
              <span className="demo-token" />
            </span>

            <div className="demo-head">
              <TeacherAvatar teacher={teacher} size={44} />
              <span className="demo-who">
                <span className="demo-name">{teacher.name}</span>
                <span className="demo-dept">{teacher.dept_name}</span>
              </span>
              <span className="demo-figures">
                {teacher.n > 0 ? (
                  <>
                    <span className="demo-score">{teacher.score.toFixed(1)}</span>
                    <span className="demo-count">
                      {teacher.n} rating{teacher.n === 1 ? "" : "s"}
                    </span>
                  </>
                ) : (
                  <span className="demo-count">Not rated yet</span>
                )}
              </span>
            </div>

            <ul className="demo-criteria">
              {CRITERIA.map((criterion, row) => (
                <li key={criterion.label} style={{ "--row": row } as React.CSSProperties}>
                  <span className="demo-label">{criterion.label}</span>
                  <span className="demo-stars">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className="demo-star"
                        data-on={i < criterion.stars ? "true" : undefined}
                        style={{ "--i": i } as React.CSSProperties}
                      />
                    ))}
                  </span>
                </li>
              ))}
            </ul>

            <span className="demo-review">
              <span className="demo-typed" style={{ "--chars": REVIEW.length } as React.CSSProperties}>
                {REVIEW}
              </span>
            </span>

            <div className="demo-send">
              <span className="demo-button">Rate anonymously</span>
              <span className="demo-student" />
              <span className="demo-sent">Recorded</span>
            </div>

            <span className="demo-ripple">
              <span className="demo-ripple-ring" />
            </span>
            <span className="demo-cursor">
              <span className="demo-cursor-arrow">
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path d="M5 2.5 19.5 12 12.6 13.2 9.6 20z" />
                </svg>
              </span>
            </span>
          </div>
        ))}
      </div>

      <ul className="demo-trace">
        {TRACE.map((item, i) => (
          <li
            key={item.label}
            className="demo-chip"
            data-kept={item.kept ? "true" : undefined}
            style={{ "--i": i } as React.CSSProperties}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
