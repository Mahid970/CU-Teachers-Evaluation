"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Download, Trash2, Upload } from "lucide-react";
import {
  LAST_TERM_KEY,
  type TokenBundle,
  bundleKey,
  downloadBackup,
  forgetDevice,
  importBackup,
} from "@/lib/tokens-client";
import { useStoredValue } from "@/lib/use-local-storage";
import { VaultPanel } from "./vault-panel";

type TeacherInfo = { id: string; name: string; designation: string; deptName: string };

export function MyTokens() {
  const term = useStoredValue(LAST_TERM_KEY);
  const rawBundle = useStoredValue(term ? bundleKey(term) : "cu_eval_none");
  const bundle = useMemo<TokenBundle | null>(
    () => (rawBundle ? (JSON.parse(rawBundle) as TokenBundle) : null),
    [rawBundle],
  );

  const [teachers, setTeachers] = useState<Record<string, TeacherInfo>>({});
  const [note, setNote] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const teacherIds = bundle?.tokens.map((t) => t.teacherId).join(",") ?? "";
  useEffect(() => {
    if (!teacherIds) return;
    let cancelled = false;
    fetch(`/api/teachers?ids=${teacherIds}`)
      .then((r) => r.json() as Promise<{ teachers: TeacherInfo[] }>)
      .then((data) => {
        if (!cancelled) setTeachers(Object.fromEntries(data.teachers.map((t) => [t.id, t])));
      })
      .catch(() => {
        if (!cancelled) setNote("Teacher names could not be loaded, but your tokens are fine.");
      });
    return () => {
      cancelled = true;
    };
  }, [teacherIds]);

  if (!bundle) {
    return (
      <div className="panel mt-10 p-8">
        <p className="display text-2xl">No tokens in this browser</p>
        <p className="prose-measure mt-2 text-sm text-ink-muted">
          Either you have not verified yet on this device, or your browser storage
          was cleared. If you set a passphrase, sign in and your tokens will come
          back. If you saved a backup file instead, restore it here.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/verify" className="btn btn-primary">
            Sign in to restore
          </Link>
          <button type="button" className="btn btn-quiet" onClick={() => fileInput.current?.click()}>
            <Upload size={16} strokeWidth={1.5} />
            Restore backup
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              await importBackup(file);
            } catch (error) {
              setNote(error instanceof Error ? error.message : "That file could not be read.");
            }
          }}
        />
        {note && <p className="mt-4 text-sm text-low">{note}</p>}
      </div>
    );
  }

  const rated = new Set(bundle.rated);
  const done = bundle.tokens.filter((t) => rated.has(t.teacherId));
  const todo = bundle.tokens.filter((t) => !rated.has(t.teacherId));

  return (
    <div className="mt-10">
      <div className="panel p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="display text-2xl">{bundle.department.name}</p>
            <p className="mt-1 text-sm text-ink-muted">
              Session {bundle.session}
            </p>
          </div>
          <p className="numerals text-sm text-ink-muted">
            {done.length} of {bundle.tokens.length} rated
          </p>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-sunk">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-500"
            style={{ width: `${(done.length / Math.max(bundle.tokens.length, 1)) * 100}%` }}
          />
        </div>

        <VaultPanel bundle={bundle} />

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className="btn btn-quiet !py-2 text-sm" onClick={() => downloadBackup(bundle)}>
            <Download size={15} strokeWidth={1.5} />
            Save backup
          </button>
          <button
            type="button"
            className="btn btn-quiet !py-2 text-sm"
            onClick={() => {
              if (
                confirm(
                  "Remove your tokens from this browser? Without a backup or a passphrase you cannot rate again.",
                )
              ) {
                forgetDevice();
              }
            }}
          >
            <Trash2 size={15} strokeWidth={1.5} />
            Forget this device
          </button>
        </div>
      </div>

      {note && <p className="mt-4 text-sm text-low">{note}</p>}

      <h2 className="display mt-12 text-2xl">Still to rate ({todo.length})</h2>
      <ul className="mt-4 space-y-2">
        {todo.map((token) => {
          const teacher = teachers[token.teacherId];
          return (
            <li key={token.teacherId}>
              <Link
                href={`/t/${token.teacherId}/rate`}
                className="row-link flex items-center justify-between gap-4 p-4"
              >
                <span>
                  <span className="block font-medium">{teacher?.name ?? token.teacherId}</span>
                  <span className="block text-xs text-ink-muted">
                    {teacher?.designation}
                    {teacher?.deptName ? `, ${teacher.deptName}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-sm font-semibold text-brand">
                  Rate
                  <ChevronRight className="row-nudge" size={16} strokeWidth={2} aria-hidden="true" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {done.length > 0 && (
        <>
          <h2 className="display mt-12 text-2xl">Already rated ({done.length})</h2>
          <ul className="mt-4 space-y-2">
            {done.map((token) => {
              const teacher = teachers[token.teacherId];
              return (
                <li key={token.teacherId}>
                  <Link
                    href={`/t/${token.teacherId}/rate`}
                    className="row-link flex items-center justify-between gap-4 p-4"
                  >
                    <span className="flex items-center gap-3">
                      <Check size={16} strokeWidth={1.5} className="text-brand" />
                      <span>
                        <span className="block font-medium">{teacher?.name ?? token.teacherId}</span>
                        <span className="block text-xs text-ink-muted">{teacher?.designation}</span>
                      </span>
                    </span>
                    <span className="text-sm text-ink-muted">Edit</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
