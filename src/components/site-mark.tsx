import Link from "next/link";

/**
 * The university crest beside the site name.
 *
 * The crest is drawn through a CSS mask rather than an `<img>`, so it takes the
 * surrounding text colour and is right in both themes without a second file.
 * The name sets on two lines: beside a crest, which is half again as tall as it
 * is wide, a single long line would leave the lockup lopsided.
 */
export function SiteMark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`site-mark ${className}`}
      aria-label="CU Teachers’ Evaluation, home"
    >
      <span className="site-crest" aria-hidden="true" />
      <span className="site-wordmark" aria-hidden="true">
        <span>CU Teachers’</span>
        <span>Evaluation</span>
      </span>
    </Link>
  );
}
