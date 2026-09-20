import type { Metadata } from "next";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { VerifyFlow } from "@/components/verify-flow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verify and rate",
  description:
    "Sign in with your University of Chittagong student account to rate your teachers anonymously.",
  robots: { index: false, follow: true },
};

export default async function VerifyPage() {
  // Read at request time rather than baked into the build: the client id is
  // public, but this way rotating it needs no rebuild.
  const { env } = await getCloudflareContext({ async: true });
  const clientId = env.GOOGLE_CLIENT_ID ?? "";
  const devLogin = env.ALLOW_DEV_LOGIN === "1";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <p className="section-marker">Step one</p>
      <h1 className="display mt-2 text-5xl">Prove you study here</h1>
      <p className="mt-4 text-ink-muted">
        Sign in once with your <strong>@std.cu.ac.bd</strong> Google account. We read
        your student ID to work out your department, hand your browser a set of
        anonymous tokens, and then forget you were here.
      </p>

      <VerifyFlow clientId={clientId} devLogin={devLogin} />
    </div>
  );
}
