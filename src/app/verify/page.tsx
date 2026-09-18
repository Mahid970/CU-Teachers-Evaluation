import type { Metadata } from "next";
import { VerifyFlow } from "@/components/verify-flow";

export const metadata: Metadata = {
  title: "Verify and rate",
  description:
    "Sign in with your University of Chittagong student account to rate your teachers anonymously.",
  robots: { index: false, follow: true },
};

export default function VerifyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <p className="section-marker">Step one</p>
      <h1 className="display mt-2 text-5xl">Prove you study here</h1>
      <p className="mt-4 text-ink-muted">
        Sign in once with your <strong>@std.cu.ac.bd</strong> Google account. We read
        your student ID to work out your department, hand your browser a set of
        anonymous tokens, and then forget you were here.
      </p>

      <VerifyFlow />
    </div>
  );
}
