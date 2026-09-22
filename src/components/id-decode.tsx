/**
 * How the site knows your department without asking: the ID is read in
 * pieces. The serial is masked because it is the one part that is yours alone.
 */
export function IdDecode({ className = "" }: { className?: string }) {
  return (
    <figure className={`id-card ${className}`}>
      <figcaption className="text-sm text-ink-muted">
        Your student ID already says where you belong
      </figcaption>
      <div className="id-digits mt-3" aria-hidden="true">
        {[
          { digits: "24", label: "Session", value: "2023–24" },
          { digits: "3", label: "Faculty", value: "Business" },
          { digits: "04", label: "Department", value: "Marketing" },
          { digits: "•••", label: "Serial", value: "Only yours" },
        ].map((part, i) => (
          <div key={part.label} className="id-part" style={{ "--i": i } as React.CSSProperties}>
            <span className="id-digit">{part.digits}</span>
            <span className="id-label">{part.label}</span>
            <span className="id-value">{part.value}</span>
          </div>
        ))}
      </div>
      <p className="sr-only">
        For example, an ID starting 24304 belongs to the 2023–24 session,
        Faculty of Business Administration, Department of Marketing.
      </p>
    </figure>
  );
}
