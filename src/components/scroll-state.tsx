"use client";

import { useEffect } from "react";

/**
 * Marks the page as scrolled, so the bar can lift off the content beneath it.
 *
 * One attribute flip when the threshold is crossed, never one per scroll event,
 * and nothing that runs while the page is moving.
 */
export function ScrollState() {
  useEffect(() => {
    const root = document.documentElement;
    let lifted: boolean | null = null;
    const update = () => {
      const next = scrollY > 8;
      if (next !== lifted) {
        lifted = next;
        if (next) root.dataset.scrolled = "true";
        else delete root.dataset.scrolled;
      }
    };
    update();
    addEventListener("scroll", update, { passive: true });
    return () => removeEventListener("scroll", update);
  }, []);

  return null;
}
