"use client";

import { useSyncExternalStore } from "react";

/**
 * Reads a localStorage key without touching state during render or in an
 * effect. The snapshot is the raw string, which stays referentially stable, so
 * callers parse it with useMemo.
 *
 * The server snapshot is always null: nothing we store in the browser is known
 * to the server, so pages render their signed-out state first.
 */
export function useStoredValue(key: string): string | null {
  return useSyncExternalStore(
    (onChange) => {
      const handle = (event: StorageEvent) => {
        if (event.key === null || event.key === key) onChange();
      };
      window.addEventListener("storage", handle);
      window.addEventListener("cu-eval-storage", onChange);
      return () => {
        window.removeEventListener("storage", handle);
        window.removeEventListener("cu-eval-storage", onChange);
      };
    },
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
}

/** Tells hooks in this tab that stored values changed (storage events do not). */
export function notifyStoredValueChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cu-eval-storage"));
  }
}
