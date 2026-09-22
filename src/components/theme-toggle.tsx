"use client";

import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { notifyStoredValueChanged, useStoredValue } from "@/lib/use-local-storage";

type Theme = "light" | "dark";

/**
 * Theme preference lives in localStorage on the reader's own device. It is a
 * per-device convenience and is never sent anywhere.
 *
 * The site is light unless the reader has chosen dark here; the device's own
 * setting is deliberately ignored. The choice is applied before first paint by
 * a script in the layout, so this only has to follow later changes. Which icon
 * shows is decided in CSS, so server and client always render the same markup.
 */
export function ThemeToggle() {
  const stored = useStoredValue("cu_eval_theme") as Theme | null;

  // Mirror the stored choice onto <html> so the CSS variables switch over.
  useEffect(() => {
    if (stored) document.documentElement.dataset.theme = stored;
  }, [stored]);

  const toggle = () => {
    const root = document.documentElement;
    const next: Theme = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("cu_eval_theme", next);
    } catch {
      // Private browsing or blocked storage: the toggle still works for this visit.
    }
    notifyStoredValueChanged();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between light and dark theme"
      className="theme-toggle p-2 text-ink-muted transition-colors hover:text-ink"
    >
      <Moon size={18} strokeWidth={1.5} className="icon-to-dark" />
      <Sun size={18} strokeWidth={1.5} className="icon-to-light" />
    </button>
  );
}
