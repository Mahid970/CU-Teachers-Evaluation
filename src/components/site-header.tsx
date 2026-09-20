import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-ground/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="display text-xl">
          CU Rate
        </Link>

        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link href="/teachers" className="nav-link hidden px-3 py-2 hover:text-brand sm:block">
            Teachers
          </Link>
          <Link href="/faculties" className="nav-link hidden px-3 py-2 hover:text-brand sm:block">
            Departments
          </Link>
          <Link href="/privacy" className="nav-link hidden px-3 py-2 hover:text-brand sm:block">
            Privacy
          </Link>
          <ThemeToggle />
          <Link href="/verify" className="btn btn-primary ml-2 !min-h-0 !px-4 !py-2">
            Rate
          </Link>
        </nav>
      </div>
    </header>
  );
}
