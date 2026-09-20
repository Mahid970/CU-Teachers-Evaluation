import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
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
 * One teacher, as a scoreboard row: rank and score are the largest things in
 * it, the name sits between them, and everything else is quiet.
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
    <Link href={`/t/${teacher.id}`} className="row-link flex items-center gap-4 p-4">
      {rank !== undefined && (
        <span
          className="score w-8 shrink-0 text-2xl"
          style={{ color: rank <= 3 ? "var(--score)" : "var(--ink-muted)" }}
        >
          {rank}
        </span>
      )}

      <TeacherAvatar teacher={teacher} morphId={teacher.id} />

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{teacher.name}</p>
        <p className="truncate text-sm text-ink-muted">{teacher.designation}</p>
        <p className="truncate text-sm text-ink-muted">{teacher.dept_name}</p>
      </div>

      <div className="shrink-0 text-right">
        {rated ? (
          <>
            {/* In a ranked list, one decimal ties constantly and the order
                looks arbitrary, so show the precision the rank is based on. */}
            <p className="score text-2xl">
              {teacher.score.toFixed(rank === undefined ? 1 : 2)}
            </p>
            <div className="mt-1 flex justify-end">
              <StarRow value={teacher.score} size={13} showValue={false} />
            </div>
            <p className="numerals mt-1 text-xs text-ink-muted">
              {teacher.n} rating{teacher.n === 1 ? "" : "s"}
            </p>
          </>
        ) : (
          <p className="text-xs text-ink-muted">
            Under {MIN_RATINGS_TO_SHOW} ratings
          </p>
        )}
      </div>
    </Link>
  );
}
