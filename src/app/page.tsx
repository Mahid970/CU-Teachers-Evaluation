import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  Clock,
  Cookie,
  Globe,
  IdCard,
  LogIn,
  Mail,
  ShieldCheck,
  Star,
  UserRound,
  Users,
  VenetianMask,
  X,
} from "lucide-react";
import { FacultyIcon } from "@/components/faculty-icon";
import { TeacherBrowser } from "@/components/teacher-browser";
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

  const mapCounts: Record<string, number> = Object.fromEntries(
    [...byFaculty].map(([key, entry]) => [key, entry.teachers]),
  );
  // The map marks Forestry by name, so it shows that institute's own count.
  mapCounts.ifes = deptSummaries.find((d) => d.slug === "ifes")?.teachers ?? 0;

  return (
    <>
      {/* ---- Hero: the ID decode carries the page ---------------------- */}
      <section className="mx-auto max-w-6xl px-4 pt-8 pb-14 sm:pt-16 lg:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-6">
            <p className="hero-pill">
              <span className="hero-pill-dot" aria-hidden="true" />
              For University of Chittagong students
            </p>

            <h1 className="display mt-5 text-[clamp(2.25rem,9vw,3.8rem)]">
              Rate the teachers who actually taught you.
            </h1>
            <p className="mt-4 text-[1.05rem] text-ink-muted sm:text-lg">
              Sign in with your university account, rate honestly, and leave
              nothing behind that points back to you.
            </p>

            <div className="mt-7 grid gap-2.5 min-[420px]:flex min-[420px]:flex-wrap min-[420px]:gap-3">
              <Link href="/verify" className="btn btn-primary">
                <Star size={17} strokeWidth={2} aria-hidden="true" />
                Rate your teachers
              </Link>
              <Link href="/teachers" className="btn btn-quiet">
                Browse all teachers
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <CampusMap counts={mapCounts} />
          </div>
        </div>

        <dl className="stat-strip reveal mt-14">
          {[
            { Icon: Users, value: counts.teachers, label: "Teachers listed", note: "across every faculty" },
            { Icon: Building2, value: counts.departments, label: "Departments", note: "and institutes" },
            { Icon: Star, value: counts.ratings, label: "Ratings so far", note: "from verified students" },
          ].map(({ Icon, value, label, note }) => (
            <div key={label} className="stat-tile">
              <Icon className="stat-watermark" size={96} strokeWidth={1} aria-hidden="true" />
              <span className="stat-icon" aria-hidden="true">
                <Icon size={20} strokeWidth={1.75} />
              </span>
              <dd className="score mt-5 text-4xl"><CountUp value={value} /></dd>
              <dt className="mt-2 font-semibold">
                {label}
                <span className="mt-0.5 block text-sm font-normal text-ink-muted">{note}</span>
              </dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ---- Leaderboard ------------------------------------------------ */}
      <section className="border-t border-hairline bg-surface-sunk/40">
        {/* A row is a name and a score. Run across the full page they are
            mostly gap, so the board keeps to a column. */}
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div>
            <TeacherBrowser
              teachers={ranked}
              limit={10}
              titles={{
                top: "Highest rated right now",
                low: "Lowest rated right now",
                most: "Most rated right now",
                name: "Teachers from A to Z",
              }}
              titleAction={
                <Link href="/teachers" className="link-grow text-sm font-semibold text-brand">
                  See all teachers
                </Link>
              }
              emptyNote={`No teacher has ${MIN_RATINGS_TO_SHOW} ratings yet. The board fills up as students rate.`}
            />
          </div>
        </div>
      </section>

      {/* ---- How it works: a real sequence, so it is numbered ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="reveal display text-3xl">Three steps, then nothing left behind</h2>

        <ol className="step-track mt-10">
          {[
            {
              Icon: LogIn,
              title: "Sign in once",
              body: "Your @std.cu.ac.bd account proves you study here. Nothing is emailed, and no login is kept.",
            },
            {
              Icon: IdCard,
              title: "Your department appears",
              body: "Your ID number says where you belong, so you only rate the teachers who taught you.",
            },
            {
              Icon: VenetianMask,
              title: "Rate anonymously",
              body: "Your browser holds signed tokens that prove you may rate, without saying who you are.",
            },
          ].map(({ Icon, title, body }, i) => (
            <li key={title} className="step-card reveal">
              <span className="step-numeral" aria-hidden="true">{i + 1}</span>
              <div className="flex items-center gap-3">
                <span className="stat-icon step-icon" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <span className="text-sm font-semibold text-ink-muted">Step {i + 1}</span>
              </div>
              <h3 className="display mt-4 text-xl">{title}</h3>
              <p className="mt-2 text-ink-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- What is not stored ---------------------------------------- */}
      <section className="border-y border-hairline bg-surface-sunk/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="reveal lg:col-span-5">
              <span className="vow-badge" aria-hidden="true">
                <ShieldCheck size={26} strokeWidth={1.5} />
              </span>
              <h2 className="display mt-5 text-3xl">What we never store</h2>
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
              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  { Icon: Mail, item: "Your email address" },
                  { Icon: IdCard, item: "Your student ID" },
                  { Icon: UserRound, item: "Your name" },
                  { Icon: Globe, item: "Your IP address" },
                  { Icon: Clock, item: "The time you rated" },
                  { Icon: Cookie, item: "Cookies of any kind" },
                ].map(({ Icon, item }) => (
                  <li key={item} className="never-tile">
                    <span className="never-icon" aria-hidden="true">
                      <Icon size={18} strokeWidth={1.75} />
                      <span className="ledger-cross">
                        <X size={10} strokeWidth={3} />
                      </span>
                    </span>
                    <span className="never-text">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="kept-card mt-4">
                <p className="text-sm font-semibold">Kept instead</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {[
                    { Icon: Star, item: "The scores" },
                    { Icon: CalendarDays, item: "The date" },
                    { Icon: VenetianMask, item: "A token that belongs to nobody" },
                  ].map(({ Icon, item }) => (
                    <li key={item} className="kept-chip">
                      <Icon size={14} strokeWidth={2} aria-hidden="true" />
                      {item}
                      <Check size={14} strokeWidth={2.5} className="text-brand" aria-hidden="true" />
                    </li>
                  ))}
                </ul>
              </div>
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
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="display flex items-center gap-2.5 text-lg leading-snug">
                      <FacultyIcon facultyKey={f.key} className="text-brand" />
                      {f.shortName}
                    </h3>
                    <span className="score text-lg text-ink-muted">{entry.teachers}</span>
                  </div>
                  <p className="mt-2 flex items-center justify-between text-sm text-ink-muted">
                    {entry.depts} department{entry.depts === 1 ? "" : "s"}
                    <ArrowUpRight className="row-arrow" size={16} strokeWidth={1.75} aria-hidden="true" />
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
