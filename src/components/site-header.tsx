import { SiteMark } from "./site-mark";
import { SiteNav } from "./site-nav";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center gap-4 px-4">
        <SiteMark />
        <SiteNav />
      </div>
    </header>
  );
}
