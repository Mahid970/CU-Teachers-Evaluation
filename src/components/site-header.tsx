import Link from "next/link";
import { Search } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-paper/92 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="display text-xl">CU Rate</span>
          <span className="hidden text-xs text-ink-muted sm:inline">
            Teacher evaluation
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link
            href="/teachers"
            className="hidden px-3 py-2 hover:text-evergreen sm:block"
          >
            Teachers
          </Link>
          <Link
            href="/faculties"
            className="hidden px-3 py-2 hover:text-evergreen sm:block"
          >
            Departments
          </Link>
          <Link href="/privacy" className="hidden px-3 py-2 hover:text-evergreen sm:block">
            Privacy
          </Link>
          <Link
            href="/teachers"
            aria-label="Search teachers"
            className="p-2 sm:hidden"
          >
            <Search size={18} strokeWidth={1.5} />
          </Link>
          <ThemeToggle />
          <Link href="/verify" className="btn btn-primary ml-2 !px-4 !py-2 text-sm">
            Rate a teacher
          </Link>
        </nav>
      </div>
    </header>
  );
}
