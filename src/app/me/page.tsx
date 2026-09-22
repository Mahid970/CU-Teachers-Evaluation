import type { Metadata } from "next";
import { MyTokens } from "@/components/my-tokens";

export const metadata: Metadata = {
  title: "My ratings",
  description: "The teachers you can still rate, kept in this browser only.",
  robots: { index: false, follow: false },
};

export default function MePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="display text-4xl">My ratings</h1>
      <p className="mt-4 max-w-xl text-ink-muted">
        This page is built from what is stored in your browser. None of it can be
        read by our server. If you set a passphrase, your other devices get it by
        decrypting a copy we cannot open.
      </p>

      <MyTokens />
    </div>
  );
}
