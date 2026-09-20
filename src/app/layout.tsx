import type { Metadata } from "next";
import { Archivo, Instrument_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

// Expanded widths carry the numbers; the width axis is used, not faked.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

// Bangla (Hind Siliguri) is added back with the translation; loading a Bengali
// face nobody reads yet only slows the first paint.

export const metadata: Metadata = {
  title: {
    default: "CU Teachers Evaluation",
    template: "%s · CU Teachers Evaluation",
  },
  description:
    "Anonymous teacher ratings by verified University of Chittagong students. No emails, names or IP addresses are ever stored.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // Tells Next the smooth scrolling is deliberate, so route changes jump
      // instead of gliding the whole page to the top.
      data-scroll-behavior="smooth"
      className={`${archivo.variable} ${instrumentSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ground text-ink">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
