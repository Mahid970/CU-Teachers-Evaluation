"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, House, Star, ShieldCheck, Users } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/", label: "Home", Icon: House },
  { href: "/teachers", label: "Teachers", Icon: Users },
  { href: "/faculties", label: "Departments", Icon: Building2 },
  { href: "/privacy", label: "Privacy", Icon: ShieldCheck },
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
    <nav className="ml-auto flex items-center gap-0.5 sm:gap-1">
      {LINKS.map(({ href, label, Icon }) => {
        const current = isCurrent(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className="nav-link"
            data-active={current ? "true" : undefined}
            aria-current={current ? "page" : undefined}
          >
            <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
            {/* Narrow bars keep the icons and drop the words, so every
                destination stays reachable instead of hiding behind a menu. */}
            <span className="nav-label">{label}</span>
          </Link>
        );
      })}

      <ThemeToggle />

      <Link href="/verify" className="btn btn-primary btn-compact ml-1 sm:ml-2">
        <Star size={15} strokeWidth={2} aria-hidden="true" />
        Rate
      </Link>
    </nav>
  );
}
