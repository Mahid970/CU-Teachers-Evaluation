/**
 * The hero: a student ID taken apart.
 *
 * Every student here is an eight digit number saying which session, faculty and
 * department they belong to. Showing that decode does two jobs at once — it
 * explains how verification works, and it says plainly that the number is all
 * we ever read.
 *
 * The staggered reveal is the site's single page-load animation, and it is pure
 * CSS: no JavaScript, and it settles instantly for anyone who asks for less
 * motion.
 */

const ID = "24304043";

const PARTS = [
  { digits: ID.slice(0, 2), label: "Session", value: "2023-24" },
  { digits: ID.slice(2, 3), label: "Faculty", value: "Business" },
  { digits: ID.slice(3, 5), label: "Department", value: "Marketing" },
  { digits: ID.slice(5, 8), label: "You", value: "Never stored" },
];

export function IdDecoder() {
  return (
    <div>
      <div className="flex justify-center gap-1.5 sm:gap-2">
        {PARTS.map((part, i) => (
          <div
            key={part.label}
            className="decode-part"
            style={{ animationDelay: `${300 + i * 220}ms` }}
          >
            <div className="id-digit text-center text-[clamp(1.6rem,6vw,2.5rem)]">
              {part.digits}
            </div>
            <div className="id-bracket decode-bracket mt-2" />
            <div className="mt-2 px-1 text-center">
              <div className="text-xs text-ink-muted">{part.label}</div>
              <div className="mt-0.5 text-[0.8rem] leading-tight font-medium">
                {part.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-sm text-ink-muted">
        Read once to find your department, then thrown away.
      </p>
    </div>
  );
}
