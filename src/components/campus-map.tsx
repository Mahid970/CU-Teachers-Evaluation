"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CAMPUS_BUILDINGS,
  CAMPUS_FACULTIES,
  CAMPUS_LANDMARKS,
  CAMPUS_OUTLINE,
  CAMPUS_ROADS,
  CAMPUS_VIEWBOX,
  CAMPUS_WATER,
} from "@/lib/campus-map";

/**
 * The campus, drawn from OpenStreetMap geometry.
 *
 * Students know this place by its shape: the lakes, the hills the roads bend
 * around, the faculty buildings they walk to. Finding your own faculty on it is
 * a faster way in than any list, and it says what the site is about before a
 * word is read.
 *
 * Every shape is real data. A faculty is only marked where OSM names that
 * building, so nothing here is placed by guesswork.
 */
export function CampusMap({
  counts,
}: {
  /** Teachers per faculty, keyed the same as the faculty catalogue. */
  counts: Record<string, number>;
}) {
  const [active, setActive] = useState<string | null>(null);
  const current = CAMPUS_FACULTIES.find((f) => f.key === active);

  return (
    <figure className="panel overflow-hidden">
      <div className="relative bg-surface-sunk">
        <svg
          viewBox={CAMPUS_VIEWBOX}
          className="campus-map block h-auto w-full"
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

          {/* Faculties last, so they sit above everything else. */}
          {CAMPUS_FACULTIES.map((f) => (
            <Link
              key={f.key}
              href={`/faculties#${f.key}`}
              onMouseEnter={() => setActive(f.key)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(f.key)}
              onBlur={() => setActive(null)}
              aria-label={`${f.label}: ${counts[f.key] ?? 0} teachers`}
            >
              <g className="campus-faculty" data-active={active === f.key ? "true" : undefined}>
                <path d={f.d} className="campus-faculty-shape" />
                <circle cx={f.x} cy={f.y} r="17" className="campus-pin-halo" />
                <circle cx={f.x} cy={f.y} r="7" className="campus-pin" />
              </g>
            </Link>
          ))}
        </svg>

        {/* One label at a time, so the map stays a map. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
          <div
            className="campus-readout panel px-3 py-2"
            data-shown={current ? "true" : undefined}
          >
            {current ? (
              <p className="text-sm">
                <span className="font-semibold">{current.label}</span>
                <span className="numerals text-ink-muted">
                  {" "}
                  — {counts[current.key] ?? 0} teachers
                </span>
              </p>
            ) : (
              <p className="text-sm text-ink-muted">
                Point at a faculty to see it, or tap to open its departments.
              </p>
            )}
          </div>
        </div>
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-hairline px-4 py-3 text-xs text-ink-muted">
        <span>
          Lakes, roads and buildings of the CU campus. Marked:{" "}
          {CAMPUS_FACULTIES.length} faculty buildings.
        </span>
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="link-grow"
        >
          Map data © OpenStreetMap contributors
        </a>
      </figcaption>
    </figure>
  );
}
