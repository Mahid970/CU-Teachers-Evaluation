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
    default: "CU Teachers’ Evaluation",
    template: "%s · CU Teachers’ Evaluation",
  },
  description:
    "Anonymous teacher ratings by verified University of Chittagong students. No emails, names or IP addresses are ever stored.",
  robots: { index: true, follow: true },
};


/**
 * Recovers a page kept from an earlier deploy.
 *
 * Script and style files are named by their contents, so a deploy replaces them
 * and the previous ones stop existing. A browser reusing an old page then asks
 * for files that are gone: nothing hydrates, every control is dead, and nothing
 * on screen says so. This catches the first missing asset and reloads, which
 * fetches the current page.
 *
 * The guard stops a reload loop, and is cleared once a page has loaded properly
 * so a genuine failure later in the session can still recover. Inline and tiny,
 * because it has to run before the assets it is watching for.
 */
const RECOVER_STALE_PAGE = `
addEventListener("error",function(e){var n=e.target;if(!n||n===window)return;
var u=n.src||n.href||"";if(u.indexOf("/_next/static/")<0)return;
try{if(sessionStorage.getItem("cu_stale"))return;sessionStorage.setItem("cu_stale","1")}catch(x){return}
location.reload()},true);
addEventListener("load",function(){setTimeout(function(){
try{sessionStorage.removeItem("cu_stale")}catch(x){}},4000)});
`.replace(/\s*\n\s*/g, "");

/**
 * Applies a saved dark theme before anything paints. Light is the default for
 * everyone, whatever their device prefers; dark only follows a choice made
 * with the toggle. Running after hydration instead would flash the wrong theme.
 */
const APPLY_THEME = `try{if(localStorage.getItem("cu_eval_theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // Tells Next the smooth scrolling is deliberate, so route changes jump
      // instead of gliding the whole page to the top.
      data-scroll-behavior="smooth"
      // Extensions such as Grammarly write attributes onto <html> and <body>
      // before React loads. This only ignores attribute differences on these
      // two tags; mismatches anywhere inside them are still reported.
      suppressHydrationWarning
      className={`${archivo.variable} ${instrumentSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ground text-ink" suppressHydrationWarning>
        {/* Plain scripts, not next/script: that queues inline code to run
            after the app loads, which is too late for either of these. */}
        <script dangerouslySetInnerHTML={{ __html: APPLY_THEME }} />
        <script dangerouslySetInnerHTML={{ __html: RECOVER_STALE_PAGE }} />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
