import type { Metadata } from "next";
import { TeacherBrowser } from "@/components/teacher-browser";
import { getAllTeachers } from "@/lib/db";
import { MIN_RATINGS_TO_SHOW } from "@/lib/rating";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "All teachers",
  description:
    "Search and sort every teacher at the University of Chittagong by rating, department or name.",
};

export default async function TeachersPage() {
  const teachers = await getAllTeachers();

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="display text-4xl">All teachers</h1>
      <p className="mt-3 max-w-2xl text-sm text-ink-muted">
        Every teacher listed on the public pages of cu.ac.bd, {teachers.length} in
        all. Ratings appear once a teacher has at least {MIN_RATINGS_TO_SHOW} of
        them; below that the numbers stay hidden so no one can be identified from
        a handful of responses.
      </p>

      <div className="mt-10">
        <TeacherBrowser teachers={teachers} initialSort="name" />
      </div>
    </div>
  );
}
