"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CAMPUS_BUILDINGS,
  CAMPUS_FACULTIES,
  CAMPUS_LANDMARKS,
  CAMPUS_OUTLINE,
  CAMPUS_ROADS,
  CAMPUS_TOUR,
  CAMPUS_TOUR_LEGS,
  CAMPUS_VIEWBOX,
  CAMPUS_WATER,
} from "@/lib/campus-map";

/**
 * The campus, drawn from OpenStreetMap geometry.
 *
 * Students know this place by its shape: the lakes, the roads the hills bend
 * around, the faculty buildings they walk to. Finding your own faculty on it is
 * a faster way in than any list, and it says what the site is about before a
 * word is read.
 *
 * Every shape is real data. A faculty is marked where OSM names that building,
 * or — for Biological Sciences, which has no single building — at the middle of
 * the grounds OSM names after the faculty.
 *
 * A line tours the faculties one hop at a time, thrown into the air rather than
 * drawn along the ground, and stops on each landing long enough to name where
 * it is. Pointing at any faculty takes the tour over.
 *
 * Drawn as two stacked layers, for phones. The campus is four hundred paths
 * and never changes after it assembles; the tour moves every frame. In one SVG,
 * every frame of the ball repainted the whole campus on the main thread, which
 * is what made scrolling past it stutter. Apart, and each on its own
 * compositor layer, the campus is painted once and the per-frame work is a
 * handful of shapes. The tour also stands still while the map is off screen,
 * while the tab is hidden, and while the page is being scrolled.
 */

const [VIEW_X, VIEW_Y, VIEW_W, VIEW_H] = CAMPUS_VIEWBOX.split(" ").map(Number);

const FLIGHT_MS = 720;
const LANDED_MS = 700;
const CLEAR_MS = 640;

const LEGS = CAMPUS_TOUR_LEGS.length;

/**
 * Stage 0 waits on the first faculty. After that the tour alternates: odd
 * stages are a hop in the air, even stages are the pause on arrival. The last
 * odd stage has no leg left to fly, and is the moment the trail clears.
 */
const STAGES = LEGS * 2 + 2;

type Stage = {
  /** The leg being flown, or null while the tour is standing still. */
  flying: number | null;
  /** The faculty under the tooltip right now, or null while in the air. */
  landedOn: string | null;
  /** Legs already flown, drawn as the trail behind. */
  drawn: number;
  clearing: boolean;
  duration: number;
};

function readStage(stage: number): Stage {
  if (stage % 2 === 0) {
    const arrived = stage / 2;
    return {
      flying: null,
      landedOn: arrived === 0 ? CAMPUS_TOUR_LEGS[0].from : CAMPUS_TOUR_LEGS[arrived - 1].to,
      drawn: arrived,
      clearing: false,
      duration: LANDED_MS,
    };
  }

  const leg = (stage - 1) / 2;
  if (leg >= LEGS) {
    return { flying: null, landedOn: null, drawn: LEGS, clearing: true, duration: CLEAR_MS };
  }
  return { flying: leg, landedOn: null, drawn: leg, clearing: false, duration: FLIGHT_MS };
}

/** The map itself never changes, so it is kept out of the tour's re-renders. */
const CampusGround = memo(function CampusGround() {
  return (
    <>
      <path d={CAMPUS_OUTLINE} className="campus-outline" />

      {CAMPUS_WATER.map((d, i) => (
        <path key={`w${i}`} d={d} className="campus-water" />
      ))}

      {CAMPUS_ROADS.map((d, i) => (
        <path key={`r${i}`} d={d} className="campus-road" />
      ))}

      {CAMPUS_BUILDINGS.map((d, i) => (
        <path
          key={`b${i}`}
          d={d}
          className="campus-building"
          style={{ animationDelay: `${Math.min(i, 60) * 6}ms` }}
        />
      ))}

      {CAMPUS_LANDMARKS.map((l) =>
        l.d ? <path key={`l${l.label}`} d={l.d} className="campus-landmark" /> : null,
      )}
    </>
  );
});

export function CampusMap({ counts }: { counts: Record<string, number> }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [motion, setMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotion(!query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Paused whenever nobody can see it move, or the page is busy scrolling.
  const frame = useRef<HTMLElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [scrolling, setScrolling] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(node);

    const onVisibility = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);

    // One state change when scrolling starts and one when it settles, never
    // one per scroll event.
    let settle: ReturnType<typeof setTimeout> | undefined;
    let busy = false;
    const onScroll = () => {
      if (!busy) {
        busy = true;
        setScrolling(true);
      }
      clearTimeout(settle);
      settle = setTimeout(() => {
        busy = false;
        setScrolling(false);
      }, 500);
    };
    addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      removeEventListener("scroll", onScroll);
      clearTimeout(settle);
    };
  }, []);

  const paused = !onScreen || !tabVisible || scrolling;

  const step = useMemo(() => readStage(stage), [stage]);

  // Pointing at a faculty holds the tour where it is: two labels competing for
  // the same map is worse than a tour that waits.
  useEffect(() => {
    if (!motion || hovered || paused) return;
    const timer = setTimeout(() => setStage((s) => (s + 1) % STAGES), step.duration);
    return () => clearTimeout(timer);
  }, [motion, hovered, paused, stage, step.duration]);

  const activeKey = hovered ?? (motion ? step.landedOn : null);
  const current = CAMPUS_FACULTIES.find((f) => f.key === activeKey);

  // The frame clips anything that leaves it, so a label near an edge is hung
  // off the marker rather than centred on it: centred, the wide ones lose their
  // first words to the left edge of the map.
  const tipTop = current ? ((current.y - VIEW_Y) / VIEW_H) * 100 : 0;
  const tipLeft = current ? ((current.x - VIEW_X) / VIEW_W) * 100 : 0;
  const tipAlign = tipLeft < 26 ? "start" : tipLeft > 74 ? "end" : "center";

  return (
    <figure ref={frame} className="panel relative overflow-hidden">
      {/* The campus: painted once, then left alone. */}
      <svg
        viewBox={CAMPUS_VIEWBOX}
        className="campus-map campus-ground block h-auto w-full bg-surface-sunk"
        aria-hidden="true"
      >
        <CampusGround />

        <text x={VIEW_X + VIEW_W - 20} y={VIEW_Y + 58} className="campus-title">
          University of
        </text>
        <text x={VIEW_X + VIEW_W - 20} y={VIEW_Y + 106} className="campus-title">
          Chittagong
        </text>
      </svg>

      {/* Everything that moves or can be pointed at, drawn over it. */}
      <svg
        viewBox={CAMPUS_VIEWBOX}
        className="campus-map campus-overlay"
        data-paused={paused ? "true" : undefined}
        role="img"
        aria-label="Map of the University of Chittagong campus, with each faculty building marked."
      >

        {motion ? (
          <g className="campus-tour" data-clearing={step.clearing ? "true" : undefined}>
            {CAMPUS_TOUR_LEGS.slice(0, step.drawn).map((leg) => (
              <path key={leg.to} d={leg.d} className="campus-leg" />
            ))}

            {step.flying !== null && (
              <g key={`fly-${stage}`} style={{ "--flight": `${FLIGHT_MS}ms` } as React.CSSProperties}>
                <path
                  d={CAMPUS_TOUR_LEGS[step.flying].d}
                  className="campus-leg campus-leg-live"
                  pathLength={1}
                />
                <circle
                  className="campus-ball-halo"
                  style={{ offsetPath: `path("${CAMPUS_TOUR_LEGS[step.flying].d}")` }}
                />
                <circle
                  className="campus-ball"
                  style={{ offsetPath: `path("${CAMPUS_TOUR_LEGS[step.flying].d}")` }}
                />
              </g>
            )}
          </g>
        ) : (
          <path d={CAMPUS_TOUR} className="campus-leg" />
        )}

        {CAMPUS_FACULTIES.map((f) => (
          <Link
            key={f.key}
            href={f.href}
            onMouseEnter={() => setHovered(f.key)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(f.key)}
            onBlur={() => setHovered(null)}
            aria-label={`${f.label}: ${counts[f.key] ?? 0} teachers`}
          >
            <g className="campus-faculty" data-active={activeKey === f.key ? "true" : undefined}>
              {f.d && <path d={f.d} className="campus-faculty-shape" />}
              <circle cx={f.x} cy={f.y} r="17" className="campus-pin-halo" />
              <circle cx={f.x} cy={f.y} r="7" className="campus-pin" />
            </g>
          </Link>
        ))}
      </svg>

      {/* The label sits on the building it belongs to, so the map keeps its
          whole frame instead of giving a strip away to text. */}
      {current && (
        <div
          className="campus-tip"
          data-align={tipAlign}
          data-below={tipTop < 16 ? "true" : undefined}
          style={{ left: `${tipLeft}%`, top: `${tipTop}%` }}
        >
          <span className="font-semibold">{current.label}</span>
          <span className="numerals text-ink-muted"> · {counts[current.key] ?? 0}</span>
        </div>
      )}
    </figure>
  );
}
