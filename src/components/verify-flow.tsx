"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { AlertCircle, Check, Download, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import {
  LAST_TERM_KEY,
  type IssuableTeacher,
  type TokenBundle,
  bundleKey,
  collectTokens,
  downloadBackup,
  emailHint,
  rememberEmailHint,
} from "@/lib/tokens-client";
import { useStoredValue } from "@/lib/use-local-storage";

type IssueData = {
  term: { id: string; label: string };
  session: string;
  department: { slug: string; name: string };
  teachers: IssuableTeacher[];
  chunkSize?: number;
};

type Choice = { slug: string; name: string };

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
  const [stage, setStage] = useState<"idle" | "working" | "choice" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [choices, setChoices] = useState<Choice[]>([]);
  const [idToken, setIdToken] = useState("");
  const [bundle, setBundle] = useState<TokenBundle | null>(null);
  const storedTerm = useStoredValue(LAST_TERM_KEY);
  const storedBundle = useStoredValue(storedTerm ? bundleKey(storedTerm) : "cu_eval_none");
  const existing = useMemo<TokenBundle | null>(
    () => (storedBundle ? (JSON.parse(storedBundle) as TokenBundle) : null),
    [storedBundle],
  );
  const [devId, setDevId] = useState("24304043");
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  async function verify(token: string, deptChoice?: string) {
    setStage("working");
    setMessage("");
    setIdToken(token);
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
      setProgress({ done: 0, total: data.teachers.length });
      const issued = await collectTokens(token, deptChoice, data, (done, total) =>
        setProgress({ done, total }),
      );
      setBundle(issued);
      setStage("done");
    } catch (error) {
      setStage("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
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
            This device already holds tokens for {existing.termLabel}
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
                  — {progress.done} of {progress.total}
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
            {bundle.termLabel}, session {bundle.session}. You can rate{" "}
            {bundle.tokens.length} teachers.
          </p>

          <hr className="hairline my-6" />

          <p className="text-sm">
            Your tokens are now in this browser. They are the only proof that you may
            rate, and they cannot be issued twice — so keep a backup if you might
            clear your browser or switch phones.
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
