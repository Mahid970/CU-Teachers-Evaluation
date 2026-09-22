import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarClock,
  Clock,
  DoorOpen,
  Gauge,
  Hourglass,
  Lightbulb,
  MessagesSquare,
  Quote,
  Repeat2,
  Scale,
  Star,
} from "lucide-react";
import { StarRow } from "@/components/stars";
import { TeacherAvatar } from "@/components/teacher-card";
import { DEPARTMENT_BY_SLUG, FACULTY_BY_KEY } from "@/lib/departments";
import { getTeacher, getTeacherReviews, getTeachersByDept } from "@/lib/db";
import {
  CRITERIA,
  MIN_REVIEWS_TO_SHOW,
} from "@/lib/rating";

// Read from the live database on every request. With ISR, `next build` wrote
// these pages from the build machine's local database, and with no refresh
// queue configured those copies were served in production indefinitely.
export const dynamic = "force-dynamic";

/** What each criterion is about, so the six bars are scannable apart. */
const CRITERION_ICON = {
  clarity: Lightbulb,
  knowledge: BookOpenCheck,
  punctuality: Clock,
  fairness: Scale,
  accessibility: DoorOpen,
  engagement: MessagesSquare,
} as const;

export async function generateMetadata({
  params,
}: PageProps<"/t/[id]">): Promise<Metadata> {
  const { id } = await params;
  const teacher = await getTeacher(id);
  if (!teacher) return { title: "Teacher not found" };
  return {
    title: teacher.name,
    description: `Anonymous student ratings for ${teacher.name}, ${teacher.designation}, ${teacher.dept_name}, University of Chittagong.`,
  };
}

export default async function TeacherPage({ params }: PageProps<"/t/[id]">) {
  const { id } = await params;
  const teacher = await getTeacher(id);
  if (!teacher) notFound();

  const dept = DEPARTMENT_BY_SLUG[teacher.dept_slug];
  const faculty = dept ? FACULTY_BY_KEY[dept.faculty] : null;
  const stats = teacher.stats;

  const colleagues = (await getTeachersByDept(teacher.dept_slug))
    .filter((t) => t.id !== teacher.id)
    .slice(0, 4);

  const reviews = await getTeacherReviews(teacher.id, MIN_REVIEWS_TO_SHOW);

  const maxBar = stats ? Math.max(...stats.distribution, 1) : 1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Link
        href={`/d/${teacher.dept_slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand"
      >
        <ArrowLeft size={15} />
        {teacher.dept_name}
      </Link>

      <header className="mt-6 flex flex-wrap items-start gap-5">
        <TeacherAvatar teacher={teacher} size={96} morphId={teacher.id} />
        <div className="min-w-0 flex-1">
          <h1 className="display text-[clamp(1.9rem,4.5vw,2.8rem)]">{teacher.name}</h1>
          <p className="mt-1 text-ink-muted">{teacher.designation}</p>
          <p className="mt-1 text-sm text-ink-muted">
            <Link href={`/d/${teacher.dept_slug}`} className="hover:text-brand">
              {teacher.dept_name}
            </Link>
            {faculty && <span className="text-ink-muted">, {faculty.name}</span>}
          </p>
        </div>

        {stats && (
          <div className="text-right">
            <p className="score text-[clamp(3rem,10vw,4.5rem)]">
              {stats.bayesian_score.toFixed(1)}
            </p>
            <div className="mt-1 flex justify-end">
              <StarRow value={stats.bayesian_score} showValue={false} size={16} />
            </div>
            <p className="numerals mt-1 text-sm text-ink-muted">
              from {stats.n} rating{stats.n === 1 ? "" : "s"}
            </p>
          </div>
        )}
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {stats ? (
            <>
              <h2 className="reveal display text-2xl">How students rate this teacher</h2>
              <ul className="mt-6 space-y-5">
                {CRITERIA.map((criterion) => {
                  const value = stats[`avg_${criterion.key}` as keyof typeof stats] as number;
                  const Icon = CRITERION_ICON[criterion.key];
                  return (
                    <li key={criterion.key} className="reveal">
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="flex items-center gap-2 font-medium">
                          <Icon
                            size={16}
                            strokeWidth={1.75}
                            className="text-brand"
                            aria-hidden="true"
                          />
                          {criterion.label}
                        </p>
                        <p className="score text-lg">{value.toFixed(1)}</p>
                      </div>
                      <p className="mb-2 pl-6 text-sm text-ink-muted">{criterion.hint}</p>
                      {/* The lowest possible score is 1, so the bar runs 1 to 5.
                          Measuring from 0 would leave every teacher looking full. */}
                      <div className="bar-track h-2 w-full">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${((value - 1) / 4) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>

              <h2 className="reveal display mt-12 text-2xl">Spread of scores</h2>
              <p className="prose-measure mt-2 text-sm text-ink-muted">
                Students gave an average of {stats.avg_overall.toFixed(1)}. The
                score above pulls small numbers of ratings towards the middle, so
                a teacher rated three times cannot leap over one rated eighty
                times.
              </p>
              <ul className="mt-5 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.distribution[star - 1] ?? 0;
                  return (
                    <li key={star} className="flex items-center gap-3">
                      <span className="numerals w-6 text-sm text-ink-muted">{star}</span>
                      <div className="bar-track h-5 flex-1">
                        <div
                          className="h-full bg-score"
                          style={{ width: `${(count / maxBar) * 100}%` }}
                        />
                      </div>
                      <span className="numerals w-10 text-right text-sm text-ink-muted">
                        {count}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {reviews.length > 0 && (
                <>
                  <h2 className="reveal display mt-12 text-2xl">In students&apos; words</h2>
                  <p className="prose-measure mt-2 text-sm text-ink-muted">
                    Written by verified students of this department. They are shown
                    in no particular order, without dates, and are not stored beside
                    the scores they came with, so none of them can be traced back to
                    a rating, or to a person.
                  </p>
                  <ul className="mt-5 space-y-3">
                    {reviews.map((body, i) => (
                      <li key={i} className="reveal review-note">
                        <Quote
                          size={15}
                          strokeWidth={1.75}
                          className="review-quote"
                          aria-hidden="true"
                        />
                        <p>{body}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="prose-measure mt-4 text-sm text-ink-muted">
                    Something here is abusive or names a person?{" "}
                    <Link href="/corrections" className="link-grow text-brand">
                      Report it
                    </Link>
                    .
                  </p>
                </>
              )}
            </>
          ) : (
            <div className="panel p-8">
              <span className="stat-icon mb-4" aria-hidden="true">
                <Hourglass size={20} strokeWidth={1.5} />
              </span>
              <h2 className="display text-2xl">No ratings yet</h2>
              <p className="prose-measure mt-3 text-ink-muted">
                Nobody has rated {teacher.name} yet. Every score here will come
                from a verified student of this department.
              </p>
              <Link href="/verify" className="btn btn-primary mt-6">
                <Star size={16} strokeWidth={2} aria-hidden="true" />
                Be the first to rate
              </Link>
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          {stats && (
            <div className="reveal panel p-6">
              <dl className="grid grid-cols-2 gap-6">
                <div>
                  <span className="stat-icon" aria-hidden="true">
                    <Repeat2 size={20} strokeWidth={1.5} />
                  </span>
                  <dd className="score mt-3 text-3xl">
                    {Math.round(stats.take_again_pct)}%
                  </dd>
                  <dt className="mt-1 text-sm text-ink-muted">Would take again</dt>
                </div>
                <div>
                  <span className="stat-icon" aria-hidden="true">
                    <Gauge size={20} strokeWidth={1.5} />
                  </span>
                  <dd className="score mt-3 text-3xl">
                    {stats.avg_difficulty.toFixed(1)}
                    <span className="text-lg text-ink-muted">/5</span>
                  </dd>
                  <dt className="mt-1 text-sm text-ink-muted">Difficulty</dt>
                </div>
              </dl>
              <p className="mt-4 text-sm text-ink-muted">
                Difficulty stands on its own. A hard course is not a bad teacher.
              </p>
              <hr className="hairline my-5" />
              <p className="flex items-start gap-2 text-sm text-ink-muted">
                <CalendarClock
                  size={15}
                  strokeWidth={1.75}
                  className="mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                Scores update as soon as a student rates.
              </p>
            </div>
          )}

          <Link href="/verify" className="btn btn-primary mt-4 w-full">
            <Star size={16} strokeWidth={2} aria-hidden="true" />
            {stats ? "Rate this teacher" : "Sign in to rate"}
          </Link>

          {teacher.profile_url && (
            <a
              href={teacher.profile_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="link-grow mt-4 inline-block text-sm text-ink-muted hover:text-brand"
            >
              Official profile on cu.ac.bd
            </a>
          )}

          {colleagues.length > 0 && (
            <div className="mt-10">
              <h2 className="display text-xl">Also in {teacher.dept_name}</h2>
              <ul className="mt-4 space-y-2">
                {colleagues.map((c) => (
                  <li key={c.id}>
                    <Link href={`/t/${c.id}`} className="row-link flex items-center gap-3 p-3">
                      <TeacherAvatar teacher={c} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{c.name}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {c.designation}
                        </span>
                      </span>
                      {c.n > 0 && (
                        <span className="score text-lg">{c.score.toFixed(1)}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
