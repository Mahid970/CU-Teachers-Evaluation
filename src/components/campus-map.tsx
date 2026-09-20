"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CAMPUS_BUILDINGS,
  CAMPUS_FACULTIES,
  CAMPUS_LANDMARKS,
  CAMPUS_OUTLINE,
  CAMPUS_ROADS,
  CAMPUS_TOUR,
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
 * Every shape is real data. A faculty is only marked where OSM names that
 * building, or — for Biological Sciences, which has none — at the middle of the
 * road and pond named after it.
 */

const [VIEW_X, VIEW_Y, VIEW_W, VIEW_H] = CAMPUS_VIEWBOX.split(" ").map(Number);

export function CampusMap({ counts }: { counts: Record<string, number> }) {
  const [active, setActive] = useState<string | null>(null);
  const current = CAMPUS_FACULTIES.find((f) => f.key === active);

  return (
    <figure className="panel relative overflow-hidden">
      <svg
        viewBox={CAMPUS_VIEWBOX}
        className="campus-map block h-auto w-full bg-surface-sunk"
        role="img"
        aria-label="Map of the University of Chittagong campus, with each faculty building marked."
      >
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

        {/* A line that walks the campus, faculty to faculty, over and over. */}
        <path d={CAMPUS_TOUR} className="campus-tour" pathLength={1} />
        <circle
          r="4.5"
          className="campus-tour-head"
          style={{ offsetPath: `path("${CAMPUS_TOUR}")` }}
        />

        {CAMPUS_FACULTIES.map((f) => (
          <Link
            key={f.key}
            href={f.href}
            onMouseEnter={() => setActive(f.key)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(f.key)}
            onBlur={() => setActive(null)}
            aria-label={`${f.label}: ${counts[f.key] ?? 0} teachers`}
          >
            <g className="campus-faculty" data-active={active === f.key ? "true" : undefined}>
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
          style={{
            left: `${((current.x - VIEW_X) / VIEW_W) * 100}%`,
            top: `${((current.y - VIEW_Y) / VIEW_H) * 100}%`,
          }}
        >
          <span className="font-semibold">{current.label}</span>
          <span className="numerals text-ink-muted"> · {counts[current.key] ?? 0}</span>
        </div>
      )}

      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        className="campus-credit"
      >
        © OpenStreetMap
      </a>
    </figure>
  );
}
