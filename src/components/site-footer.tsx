import Link from "next/link";
import { SiteMark } from "./site-mark";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-hairline">
      {/* The mark and its line take the full width on a phone; the two lists
          share the row beneath it. From laptops up all three sit in a line. */}
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 sm:py-14 lg:grid-cols-4">
        <div className="col-span-2">
          <SiteMark className="site-mark-lg" />
          <p className="prose-measure mt-4 text-sm text-ink-muted">
            Anonymous teacher ratings by verified University of Chittagong
            students. Your email, your ID and your IP address are never stored.
          </p>
        </div>

        <nav className="text-sm">
          <h2 className="font-semibold">Browse</h2>
          <ul className="mt-3 space-y-2 text-ink-muted">
            <li><Link href="/teachers" className="link-grow hover:text-brand">All teachers</Link></li>
            <li><Link href="/faculties" className="link-grow hover:text-brand">Faculties and departments</Link></li>
            <li><Link href="/verify" className="link-grow hover:text-brand">Rate your teachers</Link></li>
            <li><Link href="/me" className="link-grow hover:text-brand">My ratings</Link></li>
          </ul>
        </nav>

        <nav className="text-sm">
          <h2 className="font-semibold">About</h2>
          <ul className="mt-3 space-y-2 text-ink-muted">
            <li><Link href="/privacy" className="link-grow hover:text-brand">Privacy</Link></li>
            <li><Link href="/guidelines" className="link-grow hover:text-brand">Rating guidelines</Link></li>
            <li><Link href="/corrections" className="link-grow hover:text-brand">Corrections and removal</Link></li>
            <li><Link href="/terms" className="link-grow hover:text-brand">Terms</Link></li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-col gap-1.5 px-4 py-5 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CU Teachers Evaluation. All rights reserved.</p>
          {/* Right-aligned even when the row stacks on a phone. */}
          <p className="self-end sm:self-auto">
            Developed by{" "}
            <a
              href="https://github.com/Mahid970"
              target="_blank"
              rel="noopener noreferrer"
              className="link-grow font-semibold text-ink hover:text-brand"
            >
              Mahid
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
