import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start px-4 py-28">
      <h1 className="display text-4xl">This page is not here</h1>
      <p className="mt-4 text-ink-muted">
        The teacher or department you were looking for may have been renamed, or the
        link may be wrong.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/teachers" className="btn btn-primary">
          Browse teachers
        </Link>
        <Link href="/" className="btn btn-quiet">
          Go home
        </Link>
      </div>
    </div>
  );
}
