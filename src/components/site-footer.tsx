import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-hairline">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <p className="display text-xl">CU Rate</p>
          <p className="prose-measure mt-3 text-sm text-ink-muted">
            Anonymous teacher ratings by verified University of Chittagong
            students. Your email, your ID and your IP address are never stored.
          </p>
        </div>

        <nav className="text-sm">
          <h2 className="font-semibold">Browse</h2>
          <ul className="mt-3 space-y-2 text-ink-muted">
            <li><Link href="/teachers" className="hover:text-brand">All teachers</Link></li>
            <li><Link href="/faculties" className="hover:text-brand">Faculties and departments</Link></li>
            <li><Link href="/verify" className="hover:text-brand">Rate your teachers</Link></li>
            <li><Link href="/me" className="hover:text-brand">My ratings</Link></li>
          </ul>
        </nav>

        <nav className="text-sm">
          <h2 className="font-semibold">About</h2>
          <ul className="mt-3 space-y-2 text-ink-muted">
            <li><Link href="/privacy" className="hover:text-brand">Privacy</Link></li>
            <li><Link href="/guidelines" className="hover:text-brand">Rating guidelines</Link></li>
            <li><Link href="/corrections" className="hover:text-brand">Corrections and removal</Link></li>
            <li><Link href="/terms" className="hover:text-brand">Terms</Link></li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-hairline">
        <p className="prose-measure mx-auto max-w-6xl px-4 py-5 text-xs text-ink-muted">
          A student project, not an official website of the University of
          Chittagong. Teacher names and photographs come from the public pages of
          cu.ac.bd.
        </p>
      </div>
    </footer>
  );
}
