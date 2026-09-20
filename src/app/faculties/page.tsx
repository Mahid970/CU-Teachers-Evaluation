import type { Metadata } from "next";
import Link from "next/link";
import { StarRow } from "@/components/stars";
import { DEPARTMENT_BY_SLUG, FACULTIES } from "@/lib/departments";
import { getDepartmentSummaries } from "@/lib/db";

function summaryCode(slug: string): string {
  return DEPARTMENT_BY_SLUG[slug]?.code ?? "—";
}

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Faculties and departments",
  description:
    "Browse all faculties, departments and institutes of the University of Chittagong.",
};

export default async function FacultiesPage() {
  const summaries = await getDepartmentSummaries();

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
            <h1 className="display text-4xl">Faculties &amp; departments</h1>
      <p className="mt-3 max-w-2xl text-sm text-ink-muted">
        Nine faculties, {summaries.length} departments, institutes and centres. The
        code beside each department is the one that appears in student IDs.
      </p>

      <div className="mt-12 space-y-14">
        {FACULTIES.map((faculty) => {
          const depts = summaries.filter((d) => d.faculty_key === faculty.key);
          const teachers = depts.reduce((sum, d) => sum + d.teachers, 0);

          return (
            <section key={faculty.key} id={faculty.key} className="scroll-mt-24">
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-hairline pb-3">
                <h2 className="display text-3xl">{faculty.name}</h2>
                <p className="numerals text-sm text-ink-muted">
                  {teachers} teachers, ID code {faculty.code}
                </p>
              </div>

              <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {depts.map((d) => (
                  <li key={d.slug}>
                    <Link href={`/d/${d.slug}`} className="row-link block h-full p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="display text-lg leading-tight">{d.name}</h3>
                        {d.slug && (
                          <span className="score shrink-0 text-sm text-ink-muted">
                            {summaryCode(d.slug)}
                          </span>
                        )}
                      </div>
                      <p className="numerals mt-2 text-xs text-ink-muted">
                        {d.teachers} teacher{d.teachers === 1 ? "" : "s"}
                        {d.rated_teachers > 0 && `, ${d.rated_teachers} rated`}
                      </p>
                      {d.avg_overall != null && (
                        <div className="mt-3">
                          <StarRow value={d.avg_overall} size={14} />
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
