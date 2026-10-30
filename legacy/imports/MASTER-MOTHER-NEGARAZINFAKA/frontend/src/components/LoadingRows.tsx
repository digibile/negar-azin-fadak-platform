interface LoadingRowsProps {
  /** How many placeholder rows to draw. */
  readonly rows?: number;
  readonly label?: string;
}

/** Placeholder rows shown while a platform call is in flight, so the layout does not jump on arrival. */
export function LoadingRows({ rows = 4, label = 'در حال دریافت اطلاعات از پلتفرم…' }: LoadingRowsProps) {
  return (
    <div className="skeleton-rows" role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: rows }, (_unused, index) => (
        <span
          className="skeleton"
          key={index}
          style={{ inlineSize: `${100 - index * 7}%` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
