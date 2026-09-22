import Link from "next/link";
import { Star } from "lucide-react";
import { SiteMark } from "./site-mark";
import { MobileMenu, SiteNav } from "./site-nav";
import { ThemeToggle } from "./theme-toggle";

/**
 * One line at every size. From small tablets up the links sit in the bar; on
 * a phone they fold behind a menu button, which keeps the crest, the theme
 * switch and Rate in reach without the bar growing a second row.
 */
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center gap-x-5 px-4 sm:h-[5rem]">
        <SiteMark />

        <div className="ml-auto hidden sm:block">
          <SiteNav />
        </div>

        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <ThemeToggle />
          <Link href="/verify" className="btn btn-primary btn-compact ml-1 sm:ml-2">
            <Star size={15} strokeWidth={2} aria-hidden="true" />
            Rate
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
