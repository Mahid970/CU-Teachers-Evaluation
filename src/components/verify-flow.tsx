"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { AlertCircle, Check, Download, Loader2, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import {
  AlreadyIssuedError,
  LAST_TERM_KEY,
  type IssuableTeacher,
  type TokenBundle,
  bundleKey,
  collectTokens,
  downloadBackup,
  emailHint,
  loadBundle,
  rememberEmailHint,
  topUpTokens,
  rememberStudentId,
} from "@/lib/tokens-client";
import {
  VaultError,
  adoptRestored,
  deriveVaultKeys,
  holdKeys,
  loadVault,
  saveVault,
  studentIdFromToken,
} from "@/lib/vault";
import { PassphraseForm } from "./passphrase-form";
import { useStoredValue } from "@/lib/use-local-storage";

type IssueData = {
  term: { id: string; label: string };
  session: string;
  department: { slug: string; name: string };
  teachers: IssuableTeacher[];
  /** Teachers who joined after this student first collected. */
  addedTeachers?: IssuableTeacher[];
  chunkSize?: number;
};

type Choice = { slug: string; name: string };

type Stage = "idle" | "working" | "choice" | "setup" | "restore" | "done" | "error";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function VerifyFlow({
  clientId,
  devLogin,
}: {
  clientId: string;
  devLogin: boolean;
}) {
  const [stage, setStage] = useState<Stage>("idle");
  const [message, setMessage] = useState("");
  const [choices, setChoices] = useState<Choice[]>([]);
  const [idToken, setIdToken] = useState("");
  const [bundle, setBundle] = useState<TokenBundle | null>(null);
  const [vaultBusy, setVaultBusy] = useState(false);
  const [vaultError, setVaultError] = useState("");
  const [vaultSaved, setVaultSaved] = useState(false);
  const storedTerm = useStoredValue(LAST_TERM_KEY);
  const storedBundle = useStoredValue(storedTerm ? bundleKey(storedTerm) : "cu_eval_none");
  const existing = useMemo<TokenBundle | null>(
    () => (storedBundle ? (JSON.parse(storedBundle) as TokenBundle) : null),
    [storedBundle],
  );
  const [devId, setDevId] = useState("24304043");
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  // The ID is read from the sign-in here in the browser, never fetched. Asking
  // the server for it would put a student ID and a vault lookup in the same
  // conversation, which is the one thing the vault design avoids.
  const studentId = useRef("");
  // Kept for this page only, so a restore can go on to collect tokens for
  // teachers added since. Google's token expires within the hour anyway.
  const signIn = useRef<{ token: string; deptChoice?: string } | null>(null);

  async function verify(token: string, deptChoice?: string) {
    signIn.current = { token, deptChoice };
    setStage("working");
    setMessage("");
    setIdToken(token);
    try {
      studentId.current = studentIdFromToken(token);
    } catch {
      studentId.current = "";
    }
    let termId: string | undefined;
    try {
      const response = await fetch("/api/issue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken: token, deptChoice }),
      });
      const payload = (await response.json()) as
        | (IssueData & { needsChoice?: false })
        | { needsChoice: true; choices: Choice[]; session: string }
        | { error: string };

      if ("error" in payload) {
        setStage("error");
        setMessage(payload.error);
        return;
      }
      if ("needsChoice" in payload && payload.needsChoice) {
        setChoices(payload.choices);
        setStage("choice");
        return;
      }

      const data = payload as IssueData;
      termId = data.term.id;
      setProgress({ done: 0, total: data.teachers.length });
      let issued = await collectTokens(token, deptChoice, data, (done, total) =>
        setProgress({ done, total }),
      );
      if (data.addedTeachers && data.addedTeachers.length > 0) {
        issued = await topUpTokens(token, deptChoice, issued, data.addedTeachers);
      }
      rememberStudentId(studentId.current);
      setBundle(issued);
      setStage("setup");
    } catch (error) {
      // Not a failure: this student collected their tokens on another device,
      // so the answer is to open their vault rather than start again.
      if (error instanceof AlreadyIssuedError) {
        // The tokens may be right here: this browser collected them before it
        // had a vault to put them in. Then the job is to protect them, not to
        // restore something that was never saved.
        const local = termId ? loadBundle(termId) : null;
        if (local && local.tokens.length > 0) {
          rememberStudentId(studentId.current);
          setBundle(local);
          setStage("setup");
          return;
        }
        setStage("restore");
        setMessage(error.message);
        return;
      }
      setStage("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  async function protectTokens(passphrase: string) {
    if (!bundle) return;
    setVaultBusy(true);
    setVaultError("");
    try {
      const keys = await deriveVaultKeys(studentId.current, passphrase);
      await saveVault(keys, bundle);
      holdKeys(keys);
      setVaultSaved(true);
      setStage("done");
    } catch (error) {
      setVaultError(
        error instanceof VaultError || error instanceof Error
          ? error.message
          : "Your tokens could not be protected.",
      );
    } finally {
      setVaultBusy(false);
    }
  }

  async function restoreTokens(passphrase: string) {
    setVaultBusy(true);
    setVaultError("");
    try {
      const keys = await deriveVaultKeys(studentId.current, passphrase);
      const restored = await loadVault(keys);
      if (!restored) {
        setVaultError(
          "Nothing opened with that passphrase. Check it and try again. If you never set one up, your tokens are still in the browser you first used.",
        );
        return;
      }
      adoptRestored(restored, keys);
      rememberStudentId(studentId.current);
      // Teachers who joined since the vault was made are collected now, into
      // the restored set. A failure here must not undo the restore.
      const current = signIn.current
        ? await topUpTokens(signIn.current.token, signIn.current.deptChoice, restored).catch(
            () => restored,
          )
        : restored;
      // Written back straight away, so the vault changes on every sign-in and
      // not only when somebody rates.
      void saveVault(keys, current);
      setBundle(current);
      setVaultSaved(true);
      setStage("done");
    } catch (error) {
      setVaultError(
        error instanceof VaultError || error instanceof Error
          ? error.message
          : "That vault could not be opened.",
      );
    } finally {
      setVaultBusy(false);
    }
  }

  // Google Identity Services renders its own button once the script loads.
  useEffect(() => {
    if (!clientId || stage !== "idle") return;
    const timer = setInterval(() => {
      const holder = document.getElementById("google-button");
      if (!window.google || !holder || holder.childElementCount > 0) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        hd: "std.cu.ac.bd",
        login_hint: emailHint() || undefined,
        callback: (response: { credential: string }) => {
          void verify(response.credential);
        },
      });
      window.google.accounts.id.renderButton(holder, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        width: 320,
      });
      clearInterval(timer);
    }, 200);
    return () => clearInterval(timer);
  }, [clientId, stage]);

  return (
    <div className="mt-10">
      {clientId && <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />}

      {existing && stage === "idle" && (
        <div className="panel mb-6 p-5">
          <p className="flex items-center gap-2 font-medium">
            <Check size={18} strokeWidth={1.5} className="text-brand" />
            This device already holds your tokens
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            {existing.department.name}, {existing.tokens.length} teachers, {existing.rated.length} rated so far
          </p>
          <Link href="/me" className="btn btn-primary mt-4">
            Continue rating
          </Link>
        </div>
      )}

      {stage === "idle" && (
        <div className="panel p-6">
          {clientId ? (
            <>
              <div id="google-button" className="min-h-[44px]" />
              <p className="mt-4 text-xs text-ink-muted">
                We ask Google for one thing: that your address ends in std.cu.ac.bd.
                No name, no photo, no contacts, and nothing is stored afterwards.
              </p>
              <p className="mt-2 text-xs text-ink-muted">
                Rated on another device already? Sign in with the same account and
                we will offer to restore your tokens.
              </p>
            </>
          ) : (
            <p className="flex items-start gap-2 text-sm text-ink-muted">
              <AlertCircle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              Google sign-in is not configured yet. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID
              and GOOGLE_CLIENT_ID to switch it on.
            </p>
          )}

          {devLogin && (
            <div className="mt-6 border-t border-hairline pt-5">
              <h2 className="font-semibold">Development sign-in</h2>
              <p className="mt-2 text-xs text-ink-muted">
                Local only. Enter any valid student ID to walk through the flow.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  value={devId}
                  onChange={(e) => setDevId(e.target.value)}
                  inputMode="numeric"
                  className="numerals w-40 border border-hairline bg-ground px-3 py-2 text-sm"
                  aria-label="Development student ID"
                />
                <button
                  type="button"
                  className="btn btn-quiet !py-2"
                  onClick={() => void verify(`dev:${devId}`)}
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {stage === "working" && (
        <div className="panel p-6">
          <div className="flex items-center gap-3">
            <Loader2 size={20} strokeWidth={1.5} className="animate-spin text-brand" />
            <p>
              Signing your tokens
              {progress.total > 0 && (
                <span className="numerals text-ink-muted">
                  {" "}
                  ({progress.done} of {progress.total})
                </span>
              )}
            </p>
          </div>
          {progress.total > 0 && (
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-sunk">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-300"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          )}
          <p className="mt-3 text-xs text-ink-muted">
            Your browser is doing the private part of this. Please keep this page open.
          </p>
        </div>
      )}

      {stage === "choice" && (
        <div className="panel p-6">
          <p className="display text-2xl">Which unit are you in?</p>
          <p className="mt-2 text-sm text-ink-muted">
            Your ID uses the old marine sciences code, which three units shared. Your
            choice stays in this browser and is never sent to our database.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {choices.map((choice) => (
              <button
                key={choice.slug}
                type="button"
                className="btn btn-quiet"
                onClick={() => void verify(idToken, choice.slug)}
              >
                {choice.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === "setup" && bundle && (
        <div className="panel p-6">
          <p className="flex items-center gap-2 font-medium">
            <Check size={18} strokeWidth={1.5} className="text-brand" />
            {bundle.tokens.length} tokens collected for {bundle.department.name}
          </p>

          <hr className="hairline my-5" />

          <p className="display text-2xl">Use these on your other devices</p>
          <p className="prose-measure mt-2 text-sm text-ink-muted">
            Choose a passphrase and your browser will encrypt your tokens with it
            before uploading them. We store the result and cannot read it. Signing
            in on a laptop later and typing the same words is what gets them back.
          </p>

          <div className="mt-5">
            <PassphraseForm
              mode="create"
              busy={vaultBusy}
              error={vaultError}
              submitLabel="Protect my tokens"
              onSubmit={(value) => void protectTokens(value)}
            />
          </div>

          <button
            type="button"
            className="mt-4 text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
            onClick={() => setStage("done")}
          >
            Skip, I will only use this device
          </button>
        </div>
      )}

      {stage === "restore" && (
        <div className="panel p-6">
          <p className="flex items-center gap-2 font-medium">
            <ShieldCheck size={18} strokeWidth={1.5} className="text-brand" />
            You have already collected your tokens
          </p>
          <p className="prose-measure mt-2 text-sm text-ink-muted">
            They cannot be issued twice, because that is what stops anyone rating a teacher
            more than once. If you set a passphrase, type it and your tokens will come
            back on this device.
          </p>

          <div className="mt-5">
            <PassphraseForm
              mode="unlock"
              busy={vaultBusy}
              error={vaultError}
              submitLabel="Restore my tokens"
              onSubmit={(value) => void restoreTokens(value)}
            />
          </div>

          <p className="mt-4 text-xs text-ink-muted">
            No passphrase? Your tokens are still in the browser you first used. Open
            this site there, save the backup file, and bring it here.
          </p>
        </div>
      )}

      {stage === "error" && (
        <div className="panel border-low p-6">
          <p className="flex items-center gap-2 font-medium text-low">
            <AlertCircle size={18} strokeWidth={1.5} />
            We could not issue your tokens
          </p>
          <p className="mt-2 text-sm text-ink-muted">{message}</p>
          <button type="button" className="btn btn-quiet mt-4" onClick={() => setStage("idle")}>
            Try again
          </button>
        </div>
      )}

      {stage === "done" && bundle && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] as const }}
          className="panel relative p-7"
        >
          <span className="absolute -top-3 right-6 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-surface">
            Verified
          </span>

          <p className="display text-3xl">{bundle.department.name}</p>
          <p className="mt-1 text-sm text-ink-muted">
            Session {bundle.session}. You can rate{" "}
            {bundle.tokens.length} teachers.
          </p>

          <hr className="hairline my-6" />

          <p className="text-sm">
            {vaultSaved
              ? "Your tokens are in this browser and, encrypted, in your vault. Sign in anywhere and type your passphrase to pick up where you left off."
              : "Your tokens are in this browser only. They cannot be issued twice, so keep a backup if you might clear your browser or switch phones."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/me" className="btn btn-primary">
              Start rating
            </Link>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                downloadBackup(bundle);
                rememberEmailHint(emailHint());
              }}
            >
              <Download size={16} strokeWidth={1.5} />
              Save backup file
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
