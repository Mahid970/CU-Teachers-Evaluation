import {
  Atom,
  BookOpen,
  Briefcase,
  Cpu,
  Dna,
  GraduationCap,
  Scale,
  Users,
  Waves,
} from "lucide-react";

/**
 * One icon per faculty, used wherever faculties are listed.
 *
 * The crest itself carries a book and an atom for the two halves of the
 * university, so the set follows that idea: each faculty gets the instrument of
 * its own subject rather than a generic building.
 */
const ICONS = {
  arts: BookOpen,
  science: Atom,
  business: Briefcase,
  social: Users,
  law: Scale,
  biological: Dna,
  engineering: Cpu,
  education: GraduationCap,
  marine: Waves,
} as const;

export function FacultyIcon({
  facultyKey,
  size = 18,
  className,
}: {
  facultyKey: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[facultyKey as keyof typeof ICONS] ?? GraduationCap;
  return <Icon size={size} strokeWidth={1.6} className={className} aria-hidden="true" />;
}
