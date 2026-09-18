import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RateForm } from "@/components/rate-form";
import { TeacherAvatar } from "@/components/teacher-card";
import { getTeacher } from "@/lib/db";

export const metadata: Metadata = {
  title: "Rate a teacher",
  robots: { index: false, follow: false },
};

export default async function RatePage({ params }: PageProps<"/t/[id]/rate">) {
  const { id } = await params;
  const teacher = await getTeacher(id);
  if (!teacher) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <div className="flex items-center gap-4">
        <TeacherAvatar teacher={teacher} size={72} />
        <div>
          <p className="section-marker">Rating</p>
          <h1 className="display text-3xl leading-tight">{teacher.name}</h1>
          <p className="text-sm text-ink-muted">
            {teacher.designation} · {teacher.dept_name}
          </p>
        </div>
      </div>

      <RateForm teacherId={teacher.id} teacherName={teacher.name} />
    </div>
  );
}
