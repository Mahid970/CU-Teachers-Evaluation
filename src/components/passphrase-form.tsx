"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

/**
 * The passphrase field.
 *
 * Two jobs: take the words, and be honest about what they are for. Students are
 * used to passwords that can be reset by email, and this one cannot be — so the
 * copy says so before they choose, not after they forget.
 */

const MIN_LENGTH = 12;

/** Rough, and deliberately so: length carries most of it, variety the rest. */
function strengthOf(value: string): { score: 0 | 1 | 2 | 3; label: string } {
  const words = value.trim().split(/\s+/).filter(Boolean).length;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((r) => r.test(value)).length;
  if (value.length < MIN_LENGTH) return { score: 0, label: "Too short" };
  if (value.length >= 20 || words >= 4) return { score: 3, label: "Strong" };
  if (value.length >= 16 || classes >= 3) return { score: 2, label: "Good" };
  return { score: 1, label: "Weak, add another word" };
}

export function PassphraseForm({
  mode,
  busy,
  error,
  submitLabel,
  onSubmit,
}: {
  mode: "create" | "unlock";
  busy?: boolean;
  error?: string;
  submitLabel: string;
  onSubmit: (passphrase: string) => void;
}) {
  const [value, setValue] = useState("");
  const [confirmValue, setConfirm] = useState("");
  const [shown, setShown] = useState(false);
  const fieldId = useId();

  const strength = strengthOf(value);
  const creating = mode === "create";
  const mismatch = creating && confirmValue.length > 0 && confirmValue !== value;
  const ready = creating
    ? strength.score > 0 && value === confirmValue && !busy
    : value.length > 0 && !busy;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) onSubmit(value);
      }}
    >
      <label htmlFor={fieldId} className="block text-sm font-medium">
        {creating ? "Choose a passphrase" : "Your passphrase"}
      </label>

      <div className="relative mt-2">
        <KeyRound
          size={16}
          strokeWidth={1.5}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          id={fieldId}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete={creating ? "new-password" : "current-password"}
          className="field px-9"
          placeholder={creating ? "three or four words you will remember" : ""}
          autoFocus
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink-muted hover:text-ink"
          aria-label={shown ? "Hide passphrase" : "Show passphrase"}
        >
          {shown ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
        </button>
      </div>

      {creating && (
        <>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex flex-1 gap-1" aria-hidden="true">
              {[1, 2, 3].map((step) => (
                <span
                  key={step}
                  className="strength-step"
                  data-on={strength.score >= step ? "true" : undefined}
                />
              ))}
            </div>
            <span className="text-xs text-ink-muted">{value.length > 0 && strength.label}</span>
          </div>

          <input
            type="password"
            value={confirmValue}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="field mt-3"
            placeholder="Type it again"
            aria-label="Confirm passphrase"
          />
          {mismatch && <p className="mt-2 text-sm text-low">Those do not match.</p>}
        </>
      )}

      {error && <p className="mt-3 text-sm text-low">{error}</p>}

      <button type="submit" className="btn btn-primary mt-4 w-full" disabled={!ready}>
        {busy ? (
          <>
            <Loader2 size={16} strokeWidth={2} className="animate-spin" />
            Working out your key
          </>
        ) : (
          submitLabel
        )}
      </button>

      {creating && (
        <p className="mt-3 text-xs text-ink-muted">
          We cannot reset this. A reset would mean we could open your vault
          ourselves, which is exactly what it exists to prevent. Save the backup
          file as well if you would rather not rely on remembering.
        </p>
      )}
    </form>
  );
}
