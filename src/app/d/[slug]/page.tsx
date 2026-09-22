import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TeacherBrowser } from "@/components/teacher-browser";
import { StarRow } from "@/components/stars";
import { DEPARTMENT_BY_SLUG, FACULTY_BY_KEY } from "@/lib/departments";
import { getTeachersByDept } from "@/lib/db";

// Read from the live database on every request. With ISR, `next build` wrote
// these pages from the build machine's local database, and with no refresh
// queue configured those copies were served in production indefinitely.
export const dynamic = "force-dynamic";

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
  const rated = teachers.filter((t) => t.n > 0);
  const deptAverage =
    rated.length > 0
      ? rated.reduce((sum, t) => sum + t.score, 0) / rated.length
      : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <Link
        href="/faculties"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand"
      >
        <ArrowLeft size={15} strokeWidth={1.5} />
        All departments
      </Link>

      <header className="mt-6 border-b border-hairline pb-8">
        <h1 className="display text-4xl">{dept.name}</h1>
        <p className="mt-2 text-ink-muted">{faculty.name}</p>

        <dl className="mt-6 flex flex-wrap gap-x-12 gap-y-5 text-sm">
          <div>
            <dd className="score text-2xl">{teachers.length}</dd>
            <dt className="mt-1 text-ink-muted">Teachers</dt>
          </div>
          <div>
            <dd className="score text-2xl">{rated.length}</dd>
            <dt className="mt-1 text-ink-muted">With published ratings</dt>
          </div>
          {deptAverage !== null && (
            <div>
              <dd className="mt-1">
                <StarRow value={deptAverage} size={18} />
              </dd>
              <dt className="mt-1 text-ink-muted">Department average</dt>
            </div>
          )}
          {dept.code && (
            <div>
              <dd className="score text-2xl">{dept.code}</dd>
              <dt className="mt-1 text-ink-muted">Student ID code</dt>
            </div>
          )}
        </dl>
      </header>

      <div className="mt-10">
        <TeacherBrowser
          teachers={teachers}
          initialSort="name"
          showFilters={false}
          emptyNote={`No teacher in ${dept.name} has been rated yet. Switch to A–Z to see everyone.`}
        />
      </div>
    </div>
  );
}
