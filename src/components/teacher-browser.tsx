"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, SearchX } from "lucide-react";
import type { TeacherListItem } from "@/lib/db";
import { FACULTIES } from "@/lib/departments";
import { MIN_RATINGS_TO_SHOW } from "@/lib/rating";
import { TeacherRow } from "./teacher-card";

export type SortKey = "top" | "low" | "most" | "name";

const PAGE = 40;

const SORTS: { key: SortKey; label: string }[] = [
  { key: "top", label: "Highest rated" },
  { key: "low", label: "Lowest rated" },
  { key: "most", label: "Most rated" },
  { key: "name", label: "A–Z" },
];

/**
 * The list behind the leaderboard, the directory and each department page.
 *
 * Sorting and filtering replay a short settle on the rows, so the list visibly
 * answers the click. It is quick and front-loaded — the first few rows lead and
 * the rest follow together, rather than a long cascade you have to wait out.
 */
export function TeacherBrowser({
  teachers,
  initialSort = "top",
  showSearch = true,
  showFilters = true,
  limit,
  emptyNote,
}: {
  teachers: TeacherListItem[];
  initialSort?: SortKey;
  showSearch?: boolean;
  showFilters?: boolean;
  limit?: number;
  emptyNote?: string;
}) {
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [query, setQuery] = useState("");
  const [faculty, setFaculty] = useState("all");

  // Every teacher is searchable straight away, but only a page of them is put
  // into the document: a thousand rows is a megabyte of HTML for a phone to
  // build before it can show anything.
  const [shown, setShown] = useState(limit ?? PAGE);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = teachers.filter((t) => {
      if (faculty !== "all" && t.faculty_key !== faculty) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.dept_name.toLowerCase().includes(q) ||
        t.designation.toLowerCase().includes(q)
      );
    });

    // Ranked sorts only consider teachers past the publication threshold, so a
    // teacher with two ratings never appears as "lowest rated".
    if (sort !== "name") list = list.filter((t) => t.n > 0);

    return [...list]
      .sort((a, b) => {
        switch (sort) {
          case "top":
            return b.score - a.score;
          case "low":
            return a.score - b.score;
          case "most":
            return b.n - a.n;
          default:
            return a.name.localeCompare(b.name);
        }
      })
      .slice(0, limit ?? undefined);
  }, [teachers, query, faculty, sort, limit]);

  const page = visible.slice(0, shown);
  const remaining = visible.length - page.length;

  const ranked = sort === "top" && !query && faculty === "all";

  return (
    <div>
      {/* In a column this narrow the three controls cannot share a line without
          one of them wrapping awkwardly, so search takes the first row and the
          two that change the ordering take the second. */}
      <div className="space-y-3">
        {showSearch && (
          <label className="relative block">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShown(limit ?? PAGE);
              }}
              placeholder="Search by name or department"
              className="field pl-9"
              aria-label="Search teachers"
            />
          </label>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-1 overflow-x-auto px-4 sm:mx-0 sm:w-auto sm:flex-1 sm:px-0">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setSort(s.key);
                  setShown(limit ?? PAGE);
                }}
                aria-pressed={sort === s.key}
                className="segment"
              >
                {s.label}
              </button>
            ))}
          </div>

          {showFilters && (
            <label className="w-full sm:w-auto">
              <span className="sr-only">Filter by faculty</span>
              <select
                value={faculty}
                onChange={(e) => {
                  setFaculty(e.target.value);
                  setShown(limit ?? PAGE);
                }}
                className="field sm:w-auto"
              >
                <option value="all">All faculties</option>
                {FACULTIES.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.shortName}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm text-ink-muted" aria-live="polite">
        {visible.length} teacher{visible.length === 1 ? "" : "s"}
        {sort !== "name" && ` with at least ${MIN_RATINGS_TO_SHOW} ratings`}
      </p>

      {visible.length === 0 ? (
        <div className="panel mt-4 p-10 text-center">
          <span className="stat-icon mx-auto mb-4" aria-hidden="true">
            <SearchX size={20} strokeWidth={1.5} />
          </span>
          <p className="display text-xl">Nothing here yet</p>
          <p className="prose-measure mx-auto mt-2 text-ink-muted">
            {emptyNote ??
              `Scores appear once a teacher has ${MIN_RATINGS_TO_SHOW} ratings. Sort by A–Z to see everyone.`}
          </p>
        </div>
      ) : (
        /* Keyed on the current ordering, so changing sort or filter replays the
           settle: the list visibly answers the click instead of blinking. */
        <>
          <ul key={`${sort}-${faculty}`} className="list-settle mt-4 space-y-2">
            {page.map((t, i) => (
              <li key={t.id}>
                <TeacherRow teacher={t} rank={ranked ? i + 1 : undefined} />
              </li>
            ))}
          </ul>

          {remaining > 0 && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="btn btn-quiet mt-4 w-full"
            >
              <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
              Show {Math.min(remaining, PAGE)} more
              <span className="numerals text-ink-muted">({remaining} left)</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
