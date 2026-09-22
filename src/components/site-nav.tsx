"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

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

/** The links in a row, from small tablets up. */
export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="site-nav" aria-label="Main">
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

/**
 * On a phone the four links fold behind a button, and open as a sheet under
 * the bar. It closes itself on navigation and on Escape.
 */
export function MobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState(pathname);
  const panelId = useId();

  // Following a link changes the path; the menu should not survive that.
  if (open && openedOn !== pathname) {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        className="menu-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => {
          setOpenedOn(pathname);
          setOpen((v) => !v);
        }}
      >
        <span className="menu-toggle-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      <div id={panelId} className="menu-sheet" data-open={open ? "true" : undefined}>
        <div className="menu-sheet-inner">
          <nav aria-label="Main" className="mx-auto max-w-6xl px-4 pt-2 pb-5">
            <ul>
              {LINKS.map(({ href, label }, i) => {
                const current = isCurrent(pathname, href);
                return (
                  <li key={href} style={{ "--i": i } as React.CSSProperties}>
                    <Link
                      href={href}
                      className="menu-link"
                      tabIndex={open ? undefined : -1}
                      data-active={current ? "true" : undefined}
                      aria-current={current ? "page" : undefined}
                      onClick={() => setOpen(false)}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>

      {open && (
        <button
          type="button"
          className="menu-scrim"
          aria-label="Close menu"
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
