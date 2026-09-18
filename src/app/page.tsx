import Link from "next/link";
import { ArrowRight, Fingerprint, ListChecks, ShieldCheck } from "lucide-react";
import { TeacherBrowser } from "@/components/teacher-browser";
import { CountUp, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { HeroHeadline } from "@/components/hero-headline";
import { DEPARTMENTS, FACULTIES } from "@/lib/departments";
import { getDepartmentSummaries, getRankedTeachers, getSiteCounts } from "@/lib/db";
import { MIN_RATINGS_TO_SHOW } from "@/lib/rating";

export const revalidate = 300;

export default async function HomePage() {
  const [counts, ranked, deptSummaries] = await Promise.all([
    getSiteCounts(),
    getRankedTeachers(60),
    getDepartmentSummaries(),
  ]);

  const teachersByFaculty = new Map<string, { depts: number; teachers: number }>();
  for (const d of deptSummaries) {
    const entry = teachersByFaculty.get(d.faculty_key) ?? { depts: 0, teachers: 0 };
    entry.depts += 1;
    entry.teachers += d.teachers;
    teachersByFaculty.set(d.faculty_key, entry);
  }

  return (
    <>
      {/* ---- Hero ---------------------------------------------------- */}
      <section className="border-b border-rule">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-7">
            <p className="section-marker">University of Chittagong</p>
            <HeroHeadline />
            <p className="mt-6 max-w-lg text-lg text-ink-muted">
              Rate the teachers who actually taught you. We check that you are a CU
              student through your university Google account — then forget who you
              are, permanently.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/verify" className="btn btn-primary">
                Rate your teacher
                <ArrowRight size={18} strokeWidth={1.5} />
              </Link>
              <Link href="/teachers" className="btn btn-ghost">
                Browse teachers
              </Link>
            </div>

            <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-rule pt-6">
              <div>
                <dt className="text-xs text-ink-muted">Ratings</dt>
                <dd className="display text-3xl">
                  <CountUp value={counts.ratings} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Teachers</dt>
                <dd className="display text-3xl">
                  <CountUp value={counts.teachers} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Departments</dt>
                <dd className="display text-3xl">
                  <CountUp value={counts.departments} />
                </dd>
              </div>
            </dl>
          </div>

          {/* Anonymity stamp card, deliberately off-axis. */}
          <div className="lg:col-span-5 lg:pl-8">
            <Reveal delay={0.15}>
              <div className="card relative rotate-[-1.2deg] p-7">
                <span className="stamp absolute -top-3 right-6 rotate-[6deg] bg-paper-raised">
                  Anonymous
                </span>
                <p className="section-marker">What we store about you</p>
                <ul className="mt-5 space-y-3 text-sm">
                  {[
                    "Your email address",
                    "Your student ID",
                    "Your name",
                    "Your IP address",
                    "The time you rated",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="text-clay">✕</span>
                      <span className="text-ink-muted line-through">{item}</span>
                    </li>
                  ))}
                </ul>
                <hr className="rule my-5" />
                <p className="text-sm">
                  Your rating is signed with an anonymous token, so even we cannot tell
                  which student gave which score.
                </p>
                <Link
                  href="/privacy"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-evergreen hover:underline"
                >
                  How this works
                  <ArrowRight size={15} strokeWidth={1.5} />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Department marquee */}
        <div className="overflow-hidden border-t border-rule py-3">
          <div className="marquee-track flex w-max gap-8 whitespace-nowrap">
            {[...DEPARTMENTS, ...DEPARTMENTS].map((d, i) => (
              <span
                key={`${d.slug}-${i}`}
                className="text-xs uppercase tracking-[0.18em] text-ink-muted"
              >
                {d.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Leaderboard --------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-marker">01 — Leaderboard</p>
              <h2 className="display mt-2 text-4xl">Top rated teachers</h2>
              <p className="mt-2 max-w-xl text-sm text-ink-muted">
                Ranked by a weighted average, so a teacher with three perfect scores
                does not outrank one with eighty strong ones. Teachers with fewer
                than {MIN_RATINGS_TO_SHOW} ratings stay out of the rankings.
              </p>
            </div>
            <Link
              href="/teachers"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-evergreen hover:underline"
            >
              See all teachers
              <ArrowRight size={15} strokeWidth={1.5} />
            </Link>
          </div>
        </Reveal>

        <div className="mt-8">
          <TeacherBrowser
            teachers={ranked}
            limit={12}
            emptyNote="No teacher has reached the publication threshold yet. Ratings appear here once a teacher has at least five."
          />
        </div>
      </section>

      {/* ---- How it works -------------------------------------------- */}
      <section className="border-y border-rule bg-paper-sunk">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <Reveal>
            <p className="section-marker">02 — How it works</p>
            <h2 className="display mt-2 text-4xl">Three steps, no trace</h2>
          </Reveal>

          <Stagger className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "Sign in once",
                body: "Use your @std.cu.ac.bd Google account. Nothing is emailed, and the sign-in is never saved on our side.",
              },
              {
                icon: Fingerprint,
                title: "Your department appears",
                body: "Your ID says which department you belong to — 24304043 is Marketing, 2023-24. You only rate your own teachers.",
              },
              {
                icon: ListChecks,
                title: "Rate anonymously",
                body: "Your device holds signed tokens that prove you may rate, without saying who you are. One rating per teacher, editable until the term closes.",
              },
            ].map((step, i) => (
              <StaggerItem key={step.title}>
                <article className="card h-full p-6">
                  <div className="flex items-center justify-between">
                    <step.icon size={22} strokeWidth={1.5} className="text-evergreen" />
                    <span className="numerals display text-3xl text-rule">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="display mt-4 text-xl">{step.title}</h3>
                  <p className="mt-2 text-sm text-ink-muted">{step.body}</p>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---- Faculties ------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Reveal>
          <p className="section-marker">03 — Browse</p>
          <h2 className="display mt-2 text-4xl">Every faculty</h2>
        </Reveal>

        <Stagger className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FACULTIES.map((f) => {
            const entry = teachersByFaculty.get(f.key) ?? { depts: 0, teachers: 0 };
            return (
              <StaggerItem key={f.key}>
                <Link
                  href={`/faculties#${f.key}`}
                  className="card card-hover block h-full p-5"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="display text-xl leading-tight">{f.shortName}</h3>
                    <span className="numerals text-xs text-ink-muted">
                      Code {f.code}
                    </span>
                  </div>
                  <p className="numerals mt-3 text-sm text-ink-muted">
                    {entry.teachers} teachers · {entry.depts} departments
                  </p>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>
    </>
  );
}
