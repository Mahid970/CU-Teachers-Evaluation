import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-rule bg-paper-sunk">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <p className="display text-2xl">CU Rate</p>
          <p className="mt-3 max-w-sm text-sm text-ink-muted">
            Anonymous teacher ratings by verified University of Chittagong students.
            We never store your email, your ID or your IP address — see exactly what
            we keep on the privacy page.
          </p>
        </div>

        <nav className="text-sm">
          <p className="section-marker mb-3">Browse</p>
          <ul className="space-y-2">
            <li><Link href="/teachers" className="hover:text-evergreen">All teachers</Link></li>
            <li><Link href="/faculties" className="hover:text-evergreen">Faculties &amp; departments</Link></li>
            <li><Link href="/verify" className="hover:text-evergreen">Rate a teacher</Link></li>
            <li><Link href="/me" className="hover:text-evergreen">My ratings</Link></li>
          </ul>
        </nav>

        <nav className="text-sm">
          <p className="section-marker mb-3">About</p>
          <ul className="space-y-2">
            <li><Link href="/privacy" className="hover:text-evergreen">Privacy</Link></li>
            <li><Link href="/guidelines" className="hover:text-evergreen">Rating guidelines</Link></li>
            <li><Link href="/corrections" className="hover:text-evergreen">Corrections &amp; removal</Link></li>
            <li><Link href="/terms" className="hover:text-evergreen">Terms</Link></li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-rule">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-ink-muted">
          An independent student project. Not an official website of the University of
          Chittagong, and not affiliated with or endorsed by the university.
          Teacher names and photographs are taken from the public pages of cu.ac.bd.
        </p>
      </div>
    </footer>
  );
}
