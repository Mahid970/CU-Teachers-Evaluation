"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/teachers", label: "Teachers" },
  { href: "/faculties", label: "Departments" },
  { href: "/privacy", label: "Privacy" },
];

/**
 * A teacher's page belongs under Teachers and a department's under
 * Departments, so the bar keeps saying where you are after you follow a row
 * out of a list.
 */
function isCurrent(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/teachers") return pathname === "/teachers" || pathname.startsWith("/t/");
  if (href === "/faculties") return pathname === "/faculties" || pathname.startsWith("/d/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="site-nav">
      {LINKS.map(({ href, label }) => {
        const current = isCurrent(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className="nav-link"
            data-active={current ? "true" : undefined}
            aria-current={current ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
