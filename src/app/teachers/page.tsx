import type { Metadata } from "next";
import { TeacherBrowser } from "@/components/teacher-browser";
import { getAllTeachers } from "@/lib/db";

// Read from the live database on every request. With ISR, `next build` wrote
// these pages from the build machine's local database, and with no refresh
// queue configured those copies were served in production indefinitely.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All teachers",
  description:
    "Search and sort every teacher at the University of Chittagong by rating, department or name.",
};

export default async function TeachersPage() {
  const teachers = await getAllTeachers();

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="display text-4xl">All teachers</h1>
      <p className="mt-3 text-sm text-ink-muted">
        Every teacher listed on the public pages of cu.ac.bd, {teachers.length} in
        all. A teacher&apos;s scores appear as soon as one student has rated them.
      </p>

      <div className="mt-10">
        <TeacherBrowser teachers={teachers} initialSort="name" />
      </div>
    </div>
  );
}
