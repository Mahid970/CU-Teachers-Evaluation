"use client";

import { useEffect, useState } from "react";
import { CloudCheck, CloudOff, Lock } from "lucide-react";
import { type TokenBundle, storedStudentId } from "@/lib/tokens-client";
import {
  VaultError,
  deriveVaultKeys,
  holdKeys,
  loadVault,
  saveVault,
  vaultIsUnlocked,
} from "@/lib/vault";
import { PassphraseForm } from "./passphrase-form";

/**
 * Cross-device access, from the page where a student already has their tokens.
 *
 * Three states, and which one shows depends only on what this browser knows:
 * the tab is already unlocked, or the student has a passphrase and wants this
 * device in on it, or they have never set one up.
 *
 * The student ID used to derive the key is read from this browser and used
 * here. It is not sent with the request — the server receives a hash it cannot
 * reverse, which is what keeps it from ever learning whose vault this is.
 */
export function VaultPanel({ bundle }: { bundle: TokenBundle }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"idle" | "create" | "unlock">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const studentId = storedStudentId();

  useEffect(() => {
    void vaultIsUnlocked().then(setUnlocked);
  }, []);

  async function run(passphrase: string) {
    setBusy(true);
    setError("");
    try {
      const keys = await deriveVaultKeys(studentId, passphrase);

      if (mode === "unlock") {
        const restored = await loadVault(keys);
        if (!restored) {
          setError(
            "Nothing opened with that passphrase. Check it and try again.",
          );
          return;
        }
        // The tokens here are the ones in use; the vault is brought up to date
        // with them rather than the other way round.
        await saveVault(keys, bundle);
        setDone("This device is now syncing.");
      } else {
        await saveVault(keys, bundle);
        setDone("Your tokens are in your vault. Sign in anywhere and use that passphrase.");
      }

      holdKeys(keys);
      setUnlocked(true);
      setMode("idle");
    } catch (caught) {
      setError(
        caught instanceof VaultError || caught instanceof Error
          ? caught.message
          : "The vault could not be reached.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (unlocked === null) return null;

  if (unlocked) {
    return (
      <p className="mt-4 flex items-start gap-2 text-sm text-ink-muted">
        <CloudCheck size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand" />
        {done || "Syncing to your vault. Your progress will follow you to another device."}
      </p>
    );
  }

  if (!studentId) {
    return (
      <p className="prose-measure mt-4 text-xs text-ink-muted">
        To use these tokens on another device, sign in again from this browser.
        Deriving a vault key needs your student ID, and this browser does not
        have it. It is read from the sign-in and never asked for.
      </p>
    );
  }

  if (mode === "idle") {
    return (
      <div className="mt-5 border-t border-hairline pt-5">
        <p className="flex items-center gap-2 font-medium">
          <CloudOff size={16} strokeWidth={1.75} className="text-ink-muted" />
          This device is not syncing
        </p>
        <p className="prose-measure mt-2 text-sm text-ink-muted">
          Set a passphrase and your browser will encrypt these tokens before
          uploading them. We store the result and cannot read it. Typing the same
          words after signing in elsewhere is what brings them back.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary !py-2 text-sm" onClick={() => setMode("create")}>
            <Lock size={15} strokeWidth={1.75} />
            Set up a passphrase
          </button>
          <button type="button" className="btn btn-quiet !py-2 text-sm" onClick={() => setMode("unlock")}>
            I already have one
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 border-t border-hairline pt-5">
      <PassphraseForm
        mode={mode === "create" ? "create" : "unlock"}
        busy={busy}
        error={error}
        submitLabel={mode === "create" ? "Protect my tokens" : "Unlock syncing"}
        onSubmit={(value) => void run(value)}
      />
      <button
        type="button"
        className="mt-3 text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
        onClick={() => {
          setMode("idle");
          setError("");
        }}
      >
        Not now
      </button>
    </div>
  );
}
