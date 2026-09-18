"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";
import type { TeacherWithStats } from "@/lib/db";
import { FACULTIES } from "@/lib/departments";
import { MIN_RATINGS_TO_SHOW } from "@/lib/rating";
import { EASE } from "./motion";
import { StarRow } from "./stars";
import { TeacherAvatar, TeacherCard } from "./teacher-card";

export type SortKey = "top" | "low" | "most" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "top", label: "Highest rated" },
  { key: "low", label: "Lowest rated" },
  { key: "most", label: "Most rated" },
  { key: "name", label: "Name A–Z" },
];

/**
 * Shared browser for the home leaderboard and the full directory.
 * Sorting and filtering re-order rows with a layout animation, so positions
 * slide rather than snap.
 */
export function TeacherBrowser({
  teachers,
  initialSort = "top",
  showSearch = true,
  showFilters = true,
  limit,
  emptyNote,
}: {
  teachers: TeacherWithStats[];
  initialSort?: SortKey;
  showSearch?: boolean;
  showFilters?: boolean;
  limit?: number;
  emptyNote?: string;
}) {
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [query, setQuery] = useState("");
  const [faculty, setFaculty] = useState<string>("all");
  const [view, setView] = useState<"grid" | "table">("grid");

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
    if (sort !== "name") list = list.filter((t) => t.stats !== null);

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "top":
          return (b.stats?.bayesian_score ?? 0) - (a.stats?.bayesian_score ?? 0);
        case "low":
          return (a.stats?.bayesian_score ?? 0) - (b.stats?.bayesian_score ?? 0);
        case "most":
          return (b.stats?.n ?? 0) - (a.stats?.n ?? 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return limit ? list.slice(0, limit) : list;
  }, [teachers, query, faculty, sort, limit]);

  return (
    <div>
      <div className="mb-6 flex min-w-0 flex-wrap items-center gap-3">
        {showSearch && (
          <label className="relative w-full sm:w-auto sm:min-w-[220px] sm:flex-1">
            <Search
              size={16}
              strokeWidth={1.5}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a teacher, department or designation"
              className="w-full border border-rule bg-paper-raised py-2.5 pl-9 pr-3 text-sm outline-none focus:border-evergreen"
            />
          </label>
        )}

        <div className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-1 overflow-x-auto px-4 sm:mx-0 sm:w-auto sm:px-0">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              aria-pressed={sort === s.key}
              className={`whitespace-nowrap border px-3 py-2 text-sm transition-colors ${
                sort === s.key
                  ? "border-evergreen bg-evergreen text-paper-raised"
                  : "border-rule bg-paper-raised hover:border-evergreen"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {showFilters && (
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <SlidersHorizontal size={16} strokeWidth={1.5} className="text-ink-muted" />
            <span className="sr-only">Filter by faculty</span>
            <select
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              className="border border-rule bg-paper-raised px-3 py-2 text-sm outline-none focus:border-evergreen"
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

        <div className="ml-auto hidden items-center gap-1 sm:flex">
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            className={`p-2 ${view === "grid" ? "text-evergreen" : "text-ink-muted"}`}
          >
            <LayoutGrid size={18} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            aria-label="Table view"
            aria-pressed={view === "table"}
            className={`p-2 ${view === "table" ? "text-evergreen" : "text-ink-muted"}`}
          >
            <List size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <p className="mb-4 text-xs text-ink-muted" aria-live="polite">
        {visible.length} teacher{visible.length === 1 ? "" : "s"}
        {sort !== "name" && ` with at least ${MIN_RATINGS_TO_SHOW} ratings`}
      </p>

      {visible.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="display text-xl">Nothing to show yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            {emptyNote ??
              `Ratings appear once a teacher has at least ${MIN_RATINGS_TO_SHOW} of them. Try the "Name A–Z" sort to see everyone.`}
          </p>
        </div>
      ) : view === "grid" ? (
        <motion.ul layout className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((t, i) => (
              <motion.li
                key={t.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                <TeacherCard
                  teacher={t}
                  rank={sort === "top" && !query && faculty === "all" ? i + 1 : undefined}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      ) : (
        <motion.table layout className="w-full min-w-0 border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule text-left text-xs text-ink-muted">
              <th className="py-2 pr-3 font-medium">#</th>
              <th className="py-2 pr-3 font-medium">Teacher</th>
              <th className="hidden py-2 pr-3 font-medium sm:table-cell">Department</th>
              <th className="py-2 pr-3 font-medium">Rating</th>
              <th className="py-2 font-medium">Count</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {visible.map((t, i) => (
                <motion.tr
                  key={t.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className="border-b border-rule/60"
                >
                  <td className="numerals py-3 pr-3 text-ink-muted">{i + 1}</td>
                  <td className="py-3 pr-3">
                    <Link href={`/t/${t.id}`} className="flex items-center gap-3 hover:text-evergreen">
                      <TeacherAvatar teacher={t} size={36} />
                      <span>
                        <span className="block font-medium">{t.name}</span>
                        <span className="block text-xs text-ink-muted">{t.designation}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="hidden py-3 pr-3 text-ink-muted sm:table-cell">{t.dept_name}</td>
                  <td className="py-3 pr-3">
                    {t.stats ? <StarRow value={t.stats.avg_overall} size={14} /> : "—"}
                  </td>
                  <td className="numerals py-3 text-ink-muted">{t.stats?.n ?? 0}</td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </motion.table>
      )}
    </div>
  );
}
