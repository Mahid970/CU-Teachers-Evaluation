import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PHOTO_PREFIX, type TeacherListItem } from "@/lib/db";
import { MIN_RATINGS_TO_SHOW } from "@/lib/rating";
import { StarRow } from "./stars";

export function TeacherAvatar({
  teacher,
  size = 56,
  morphId,
}: {
  teacher: { name: string; photo_url?: string | null; photo?: string | null };
  size?: number;
  /** Set on both the list row and the teacher page to morph between them. */
  morphId?: string;
}) {
  const photo =
    teacher.photo_url ?? (teacher.photo ? `${PHOTO_PREFIX}${teacher.photo}` : null);
  const initials = teacher.name
    .replace(/^(Dr|Prof|Professor|Mr|Ms|Mrs)\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const frame = (
    <div
      className="avatar relative shrink-0 overflow-hidden rounded-lg bg-brand-wash"
      style={{ width: size, height: size }}
    >
      {photo ? (
        <Image
          src={photo}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span
          className="display flex h-full w-full items-center justify-center text-brand"
          style={{ fontSize: size / 2.9 }}
          aria-hidden="true"
        >
          {initials}
        </span>
      )}
    </div>
  );

  if (!morphId) return frame;

  return (
    <ViewTransition name={`teacher-${morphId}`} share="morph" default="none">
      {frame}
    </ViewTransition>
  );
}

/**
 * One teacher, as a scoreboard row.
 *
 * Rank and score are the two largest things in it and sit at opposite ends; the
 * name spans the gap between them. Everything that merely qualifies the name —
 * the post, the department — is folded onto a single quiet line, so the row is
 * three lines tall instead of four and a list of them scans as a table.
 */
export function TeacherRow({
  teacher,
  rank,
}: {
  teacher: TeacherListItem;
  rank?: number;
}) {
  const rated = teacher.n > 0;
  return (
    <Link href={`/t/${teacher.id}`} className="row-link teacher-row">
      {rank !== undefined && (
        <span className="rank-badge" data-lead={rank <= 3 ? "true" : undefined}>
          {rank}
        </span>
      )}

      <TeacherAvatar teacher={teacher} morphId={teacher.id} size={52} />

      <div className="min-w-0 flex-1">
        <p className="teacher-name truncate">{teacher.name}</p>
        <p className="teacher-meta truncate">
          {teacher.designation}
          <span className="meta-dot" aria-hidden="true" />
          {teacher.dept_name}
        </p>
      </div>

      <div className="teacher-figures">
        {rated ? (
          <>
            {/* In a ranked list, one decimal ties constantly and the order
                looks arbitrary, so show the precision the rank is based on. */}
            <p className="score text-2xl">
              {teacher.score.toFixed(rank === undefined ? 1 : 2)}
            </p>
            <StarRow value={teacher.score} size={12} showValue={false} />
            <p className="numerals text-xs text-ink-muted">
              {teacher.n} rating{teacher.n === 1 ? "" : "s"}
            </p>
          </>
        ) : (
          <p className="text-xs text-ink-muted">
            Under {MIN_RATINGS_TO_SHOW} ratings
          </p>
        )}
      </div>

      <ChevronRight
        className="row-chevron"
        size={18}
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </Link>
  );
}
