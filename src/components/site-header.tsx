import Link from "next/link";
import { Star } from "lucide-react";
import { SiteMark } from "./site-mark";
import { SiteNav } from "./site-nav";
import { ThemeToggle } from "./theme-toggle";

/**
 * With the words spelled out rather than shown as icons, the four destinations
 * no longer fit beside the mark on a phone. The bar wraps instead: the mark and
 * the controls hold the first line, and the links take a line of their own —
 * every destination stays one tap away, rather than folding into a menu.
 */
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 px-4 py-3 sm:h-[5rem] sm:flex-nowrap sm:py-0">
        <SiteMark />

        <div className="order-last w-full overflow-x-auto sm:order-none sm:ml-auto sm:w-auto sm:overflow-visible">
          <SiteNav />
        </div>

        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <ThemeToggle />
          <Link href="/verify" className="btn btn-primary btn-compact ml-1 sm:ml-2">
            <Star size={15} strokeWidth={2} aria-hidden="true" />
            Rate
          </Link>
        </div>
      </div>
    </header>
  );
}
