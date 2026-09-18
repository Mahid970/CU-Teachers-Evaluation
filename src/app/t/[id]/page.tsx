import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import { CountUp, GrowBar, Reveal } from "@/components/motion";
import { StarRow } from "@/components/stars";
import { TeacherAvatar } from "@/components/teacher-card";
import { DEPARTMENT_BY_SLUG, FACULTY_BY_KEY } from "@/lib/departments";
import { getTeacher, getTeachersByDept } from "@/lib/db";
import { CRITERIA, MIN_RATINGS_TO_SHOW, TAGS } from "@/lib/rating";

export const revalidate = 300;

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

  const maxBar = stats ? Math.max(...stats.distribution, 1) : 1;
  const topTags = stats
    ? Object.entries(stats.tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <Link
        href={`/d/${teacher.dept_slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-evergreen"
      >
        <ArrowLeft size={15} strokeWidth={1.5} />
        {teacher.dept_name}
      </Link>

      <div className="mt-6 grid gap-12 lg:grid-cols-12">
        {/* ---- Identity ------------------------------------------------ */}
        <div className="lg:col-span-5">
          <div className="flex items-start gap-5">
            <TeacherAvatar teacher={teacher} size={108} />
            <div className="min-w-0">
              <h1 className="display text-4xl leading-tight">{teacher.name}</h1>
              <p className="mt-1 text-ink-muted">{teacher.designation}</p>
              <p className="mt-1 text-sm text-ink-muted">
                <Link href={`/d/${teacher.dept_slug}`} className="hover:text-evergreen">
                  {teacher.dept_name}
                </Link>
                {faculty && <> · {faculty.shortName}</>}
              </p>
            </div>
          </div>

          {stats ? (
            <div className="card mt-8 p-6">
              <p className="section-marker">Overall</p>
              <div className="mt-2 flex items-end gap-4">
                <p className="display text-6xl leading-none">
                  <CountUp value={stats.avg_overall} decimals={1} />
                </p>
                <div className="pb-1.5">
                  <StarRow value={stats.avg_overall} showValue={false} size={18} />
                  <p className="numerals mt-1 text-xs text-ink-muted">
                    {stats.n} rating{stats.n === 1 ? "" : "s"} · updated daily
                  </p>
                </div>
              </div>

              <hr className="rule my-5" />

              <dl className="grid grid-cols-2 gap-5">
                <div>
                  <dt className="text-xs text-ink-muted">Would take again</dt>
                  <dd className="display mt-1 text-2xl">
                    <CountUp value={stats.take_again_pct} decimals={0} suffix="%" />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Difficulty</dt>
                  <dd className="display mt-1 text-2xl">
                    <CountUp value={stats.avg_difficulty} decimals={1} />
                    <span className="text-base text-ink-muted"> / 5</span>
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-ink-muted">
                Difficulty is shown on its own. A hard course is not a bad teacher.
              </p>
            </div>
          ) : (
            <div className="card mt-8 p-6">
              <p className="display text-2xl">Not enough ratings yet</p>
              <p className="mt-2 text-sm text-ink-muted">
                Scores stay hidden until a teacher has at least {MIN_RATINGS_TO_SHOW}{" "}
                ratings, so that no one can be identified from a small number of
                responses.
              </p>
              <Link href="/verify" className="btn btn-primary mt-5 w-full">
                Be one of the first to rate
              </Link>
            </div>
          )}

          <Link href="/verify" className="btn btn-ghost mt-3 w-full">
            {stats ? "Rate this teacher" : "Sign in to rate"}
          </Link>

          {teacher.profile_url && (
            <a
              href={teacher.profile_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-evergreen"
            >
              Official cu.ac.bd profile
              <ArrowRight size={13} strokeWidth={1.5} />
            </a>
          )}
        </div>

        {/* ---- Breakdown ----------------------------------------------- */}
        <div className="lg:col-span-7">
          {stats ? (
            <>
              <Reveal>
                <h2 className="display text-2xl">How students rate this teacher</h2>
              </Reveal>

              <ul className="mt-6 space-y-5">
                {CRITERIA.map((criterion, i) => {
                  const value = stats[`avg_${criterion.key}` as keyof typeof stats] as number;
                  return (
                    <li key={criterion.key}>
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="font-medium">{criterion.label}</p>
                        <p className="numerals text-sm font-semibold">
                          {value.toFixed(1)}
                        </p>
                      </div>
                      <p className="mb-2 text-xs text-ink-muted">{criterion.hint}</p>
                      <GrowBar value={value} delay={i * 0.07} />
                    </li>
                  );
                })}
              </ul>

              <Reveal className="mt-12">
                <h2 className="display text-2xl">Spread of overall scores</h2>
                <ul className="mt-5 space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = stats.distribution[star - 1] ?? 0;
                    return (
                      <li key={star} className="flex items-center gap-3">
                        <span className="numerals w-8 text-sm text-ink-muted">
                          {star}★
                        </span>
                        <div className="h-5 flex-1 bg-paper-sunk">
                          <div
                            className="h-full bg-evergreen/80"
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
              </Reveal>

              {topTags.length > 0 && (
                <Reveal className="mt-12">
                  <h2 className="display text-2xl">What students said</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {topTags.map(([key, count]) => (
                      <span key={key} className="chip">
                        {TAGS.find((t) => t.key === key)?.label ?? key}
                        <span className="numerals text-ink-muted">{count}</span>
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 flex items-start gap-2 text-xs text-ink-muted">
                    <Info size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                    Students choose from a fixed list of tags. Written comments are not
                    collected, because writing style can identify a student.
                  </p>
                </Reveal>
              )}
            </>
          ) : (
            <div className="card flex h-full flex-col items-start justify-center p-10">
              <p className="section-marker">Nothing to show yet</p>
              <p className="display mt-3 text-3xl">
                This page fills up once five students have rated.
              </p>
              <p className="mt-3 max-w-md text-sm text-ink-muted">
                Every score here comes from a verified CU student of this department.
                Until the threshold is reached, individual ratings are never shown or
                hinted at.
              </p>
            </div>
          )}

          {colleagues.length > 0 && (
            <div className="mt-14">
              <h2 className="display text-2xl">Also in {teacher.dept_name}</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {colleagues.map((c) => (
                  <li key={c.id}>
                    <Link href={`/t/${c.id}`} className="card card-hover flex items-center gap-3 p-3">
                      <TeacherAvatar teacher={c} size={44} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{c.name}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {c.stats ? `${c.stats.avg_overall.toFixed(1)} ★` : "Not rated yet"}
                        </span>
                      </span>
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
