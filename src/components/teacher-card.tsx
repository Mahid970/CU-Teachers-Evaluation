import Image from "next/image";
import Link from "next/link";
import type { TeacherWithStats } from "@/lib/db";
import { MIN_RATINGS_TO_SHOW } from "@/lib/rating";
import { StarRow } from "./stars";

export function TeacherAvatar({
  teacher,
  size = 64,
}: {
  teacher: Pick<TeacherWithStats, "name" | "photo_url">;
  size?: number;
}) {
  const initials = teacher.name
    .replace(/^(Dr|Prof|Professor|Mr|Ms|Mrs)\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="relative shrink-0 overflow-hidden border border-rule bg-evergreen-wash"
      style={{ width: size, height: size }}
    >
      {teacher.photo_url ? (
        <Image
          src={teacher.photo_url}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
          unoptimized
        />
      ) : (
        <span
          className="display flex h-full w-full items-center justify-center text-evergreen"
          style={{ fontSize: size / 2.8 }}
          aria-hidden="true"
        >
          {initials}
        </span>
      )}
    </div>
  );
}

export function TeacherCard({
  teacher,
  rank,
}: {
  teacher: TeacherWithStats;
  rank?: number;
}) {
  return (
    <Link
      href={`/t/${teacher.id}`}
      className="card card-hover flex items-start gap-4 p-4"
    >
      {rank !== undefined && (
        <span className="numerals display mt-1 w-8 shrink-0 text-2xl text-amber">
          {rank}
        </span>
      )}
      <TeacherAvatar teacher={teacher} />
      <div className="min-w-0 flex-1">
        <p className="display truncate text-lg leading-tight">{teacher.name}</p>
        <p className="mt-0.5 truncate text-sm text-ink-muted">{teacher.designation}</p>
        <p className="mt-1 truncate text-xs text-ink-muted">{teacher.dept_name}</p>

        <div className="mt-3">
          {teacher.stats ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <StarRow value={teacher.stats.avg_overall} />
              <span className="numerals text-xs text-ink-muted">
                {teacher.stats.n} rating{teacher.stats.n === 1 ? "" : "s"}
              </span>
            </div>
          ) : (
            <p className="text-xs text-ink-muted">
              Fewer than {MIN_RATINGS_TO_SHOW} ratings — results hidden
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
