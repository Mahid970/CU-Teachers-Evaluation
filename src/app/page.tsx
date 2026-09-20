import Link from "next/link";
import { TeacherBrowser } from "@/components/teacher-browser";
import { IdDecoder } from "@/components/id-decoder";
import { CountUp } from "@/components/count-up";
import { CampusMap } from "@/components/campus-map";
import { FACULTIES } from "@/lib/departments";
import { getDepartmentSummaries, getRankedTeachers, getSiteCounts } from "@/lib/db";
import { MIN_RATINGS_TO_SHOW } from "@/lib/rating";

export const revalidate = 300;

export default async function HomePage() {
  const [counts, ranked, deptSummaries] = await Promise.all([
    getSiteCounts(),
    getRankedTeachers(60),
    getDepartmentSummaries(),
  ]);

  const byFaculty = new Map<string, { depts: number; teachers: number }>();
  for (const d of deptSummaries) {
    const entry = byFaculty.get(d.faculty_key) ?? { depts: 0, teachers: 0 };
    entry.depts += 1;
    entry.teachers += d.teachers;
    byFaculty.set(d.faculty_key, entry);
  }

  const teachersByFaculty = Object.fromEntries(
    [...byFaculty].map(([key, entry]) => [key, entry.teachers]),
  );

  return (
    <>
      {/* ---- Hero: the ID decode carries the page ---------------------- */}
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-6">
            <h1 className="display text-[clamp(2.4rem,6vw,3.8rem)]">
              Rate the teachers who actually taught you.
            </h1>
            <p className="prose-measure mt-6 text-lg text-ink-muted">
              Honest ratings, from students the university can verify — and an
              account of you that stops existing the moment you sign in.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/verify" className="btn btn-primary">
                Rate your teachers
              </Link>
              <Link href="/teachers" className="btn btn-quiet">
                Browse all teachers
              </Link>
            </div>

            <div className="mt-10 border-t border-hairline pt-6">
              <IdDecoder />
            </div>
          </div>

          <div className="lg:col-span-6">
            <CampusMap counts={teachersByFaculty} />
          </div>
        </div>

        <dl className="reveal mt-14 flex flex-wrap gap-x-14 gap-y-6 border-t border-hairline pt-6">
          <div>
            <dd className="score text-3xl"><CountUp value={counts.teachers} /></dd>
            <dt className="mt-1 text-sm text-ink-muted">Teachers listed</dt>
          </div>
          <div>
            <dd className="score text-3xl"><CountUp value={counts.departments} /></dd>
            <dt className="mt-1 text-sm text-ink-muted">Departments</dt>
          </div>
          <div>
            <dd className="score text-3xl"><CountUp value={counts.ratings} /></dd>
            <dt className="mt-1 text-sm text-ink-muted">Ratings so far</dt>
          </div>
        </dl>
      </section>

      {/* ---- Leaderboard ------------------------------------------------ */}
      <section className="border-t border-hairline bg-surface-sunk/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="reveal flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="display text-3xl">Highest rated right now</h2>
              <p className="prose-measure mt-3 text-ink-muted">
                Scores are weighted by how many students rated, so a teacher
                with three perfect scores does not outrank one with eighty strong
                ones. Nobody appears until {MIN_RATINGS_TO_SHOW} students have
                rated them.
              </p>
            </div>
            <Link
              href="/teachers"
              className="link-grow text-sm font-semibold text-brand"
            >
              See all teachers
            </Link>
          </div>

          <div className="mt-8">
            <TeacherBrowser
              teachers={ranked}
              limit={10}
              emptyNote={`No teacher has ${MIN_RATINGS_TO_SHOW} ratings yet. The board fills up as students rate.`}
            />
          </div>
        </div>
      </section>

      {/* ---- How it works: a real sequence, so it is numbered ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="reveal display text-3xl">Three steps, then nothing left behind</h2>

        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Sign in once",
              body: "Your @std.cu.ac.bd account proves you study here. Nothing is emailed, and no login is kept.",
            },
            {
              title: "Your department appears",
              body: "Your ID number says where you belong, so you only rate the teachers who taught you.",
            },
            {
              title: "Rate anonymously",
              body: "Your browser holds signed tokens that prove you may rate, without saying who you are.",
            },
          ].map((step, i) => (
            <li key={step.title} className="reveal border-t-2 border-ink pt-4">
              <span className="score text-lg text-ink-muted">{i + 1}</span>
              <h3 className="display mt-2 text-xl">{step.title}</h3>
              <p className="mt-2 text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- What is not stored ---------------------------------------- */}
      <section className="border-y border-hairline bg-surface-sunk/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="reveal lg:col-span-5">
              <h2 className="display text-3xl">What we never store</h2>
              <p className="prose-measure mt-3 text-ink-muted">
                A student who rates honestly should never face consequences for
                it, so the link between a person and a rating is never created in
                the first place.
              </p>
              <Link
                href="/privacy"
                className="link-grow mt-5 inline-block text-sm font-semibold text-brand"
              >
                How that works
              </Link>
            </div>

            <div className="reveal lg:col-span-7">
              <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {[
                  "Your email address",
                  "Your student ID",
                  "Your name",
                  "Your IP address",
                  "The time you rated",
                  "Cookies of any kind",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-baseline gap-3 border-b border-hairline pb-3 text-ink-muted"
                  >
                    <span aria-hidden="true" className="text-low">
                      ✕
                    </span>
                    <span className="line-through">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-ink-muted">
                Kept instead: the scores themselves, the date, and a token that
                belongs to nobody.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Faculties --------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="reveal display text-3xl">Browse by faculty</h2>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FACULTIES.map((f) => {
            const entry = byFaculty.get(f.key) ?? { depts: 0, teachers: 0 };
            return (
              <li key={f.key} className="reveal">
                <Link href={`/faculties#${f.key}`} className="row-link block p-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="display text-lg leading-snug">{f.shortName}</h3>
                    <span className="score text-lg text-ink-muted">{entry.teachers}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink-muted">
                    {entry.depts} departments
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
