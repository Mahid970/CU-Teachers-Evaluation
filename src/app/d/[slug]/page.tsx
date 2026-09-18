import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TeacherBrowser } from "@/components/teacher-browser";
import { StarRow } from "@/components/stars";
import { DEPARTMENT_BY_SLUG, FACULTY_BY_KEY } from "@/lib/departments";
import { getTeachersByDept } from "@/lib/db";
import { MIN_RATINGS_TO_SHOW } from "@/lib/rating";

export const revalidate = 300;

// Rendered on demand and cached (see `revalidate`), rather than prerendered:
// the database is a Cloudflare binding that is not available at build time.
export async function generateMetadata({
  params,
}: PageProps<"/d/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const dept = DEPARTMENT_BY_SLUG[slug];
  if (!dept) return { title: "Department not found" };
  return {
    title: dept.name,
    description: `Teachers of the ${dept.name} ${dept.kind} at the University of Chittagong, with anonymous student ratings.`,
  };
}

export default async function DepartmentPage({ params }: PageProps<"/d/[slug]">) {
  const { slug } = await params;
  const dept = DEPARTMENT_BY_SLUG[slug];
  if (!dept) notFound();

  const faculty = FACULTY_BY_KEY[dept.faculty];
  const teachers = await getTeachersByDept(slug);
  const rated = teachers.filter((t) => t.stats);
  const deptAverage =
    rated.length > 0
      ? rated.reduce((sum, t) => sum + (t.stats?.avg_overall ?? 0), 0) / rated.length
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <Link
        href="/faculties"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-evergreen"
      >
        <ArrowLeft size={15} strokeWidth={1.5} />
        All departments
      </Link>

      <header className="mt-6 border-b border-rule pb-8">
        <p className="section-marker">{faculty.name}</p>
        <h1 className="display mt-2 text-5xl">{dept.name}</h1>

        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 text-sm">
          <div>
            <dt className="text-xs text-ink-muted">Teachers</dt>
            <dd className="numerals display text-2xl">{teachers.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">With published ratings</dt>
            <dd className="numerals display text-2xl">{rated.length}</dd>
          </div>
          {deptAverage !== null && (
            <div>
              <dt className="text-xs text-ink-muted">Department average</dt>
              <dd className="mt-1">
                <StarRow value={deptAverage} size={18} />
              </dd>
            </div>
          )}
          {dept.code && (
            <div>
              <dt className="text-xs text-ink-muted">ID code</dt>
              <dd className="numerals display text-2xl">{dept.code}</dd>
            </div>
          )}
        </dl>
      </header>

      <div className="mt-10">
        <TeacherBrowser
          teachers={teachers}
          initialSort="name"
          showFilters={false}
          emptyNote={`No teacher in ${dept.name} has reached ${MIN_RATINGS_TO_SHOW} ratings yet. Switch to "Name A–Z" to see everyone.`}
        />
      </div>
    </div>
  );
}
