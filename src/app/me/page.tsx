import type { Metadata } from "next";
import { MyTokens } from "@/components/my-tokens";

export const metadata: Metadata = {
  title: "My ratings",
  description: "The teachers you can still rate this term, kept in this browser only.",
  robots: { index: false, follow: false },
};

export default function MePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="section-marker">This device only</p>
      <h1 className="display mt-2 text-5xl">My ratings</h1>
      <p className="mt-4 max-w-xl text-ink-muted">
        This page is built entirely from what is stored in your browser. Nothing on
        it is known to our server, and it looks empty on any other device.
      </p>

      <MyTokens />
    </div>
  );
}
