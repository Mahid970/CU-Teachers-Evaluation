import type { Metadata } from "next";
import { Fraunces, Hind_Siliguri, Public_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  subsets: ["bengali"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "CU Teacher Evaluation",
    template: "%s · CU Teacher Evaluation",
  },
  description:
    "Anonymous teacher ratings by verified University of Chittagong students. No emails, names or IP addresses are ever stored.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${fraunces.variable} ${publicSans.variable} ${hindSiliguri.variable} h-full antialiased`}
    >
      <head>
        {/* Scroll-reveal animations start at opacity 0. Without JavaScript they
            would never run, so force everything visible in that case. */}
        <noscript>
          <style>{`[style*="opacity:0"],[style*="opacity: 0"]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
