"use client";

import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { notifyStoredValueChanged, useStoredValue } from "@/lib/use-local-storage";

type Theme = "light" | "dark";

/**
 * Theme preference lives in localStorage on the reader's own device. It is a
 * per-device convenience and is never sent anywhere.
 *
 * Which icon shows is decided in CSS rather than in JavaScript: the server
 * cannot know the visitor's system theme, so rendering the icon from a guess
 * would produce a hydration mismatch on every dark-mode visit.
 */
export function ThemeToggle() {
  const stored = useStoredValue("cu_eval_theme") as Theme | null;

  // Mirror the stored choice onto <html> so the CSS variables switch over.
  useEffect(() => {
    if (stored) document.documentElement.dataset.theme = stored;
  }, [stored]);

  const toggle = () => {
    const root = document.documentElement;
    const isDark =
      root.dataset.theme === "dark" ||
      (!root.dataset.theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const next: Theme = isDark ? "light" : "dark";
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
