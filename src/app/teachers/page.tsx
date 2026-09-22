import type { Metadata } from "next";
import { TeacherBrowser } from "@/components/teacher-browser";
import { getAllTeachers } from "@/lib/db";

export const revalidate = 300;

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
