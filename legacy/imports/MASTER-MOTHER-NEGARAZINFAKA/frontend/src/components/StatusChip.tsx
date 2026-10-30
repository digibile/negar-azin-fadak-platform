type Tone = 'neutral' | 'positive' | 'caution' | 'critical' | 'info' | 'brand';

interface StatusChipProps {
  readonly label: string;
  readonly tone?: Tone;
  /** Renders the leading dot, for a status whose colour carries meaning on its own. */
  readonly dot?: boolean;
}

/** A compact status pill. The label is always text, so the meaning survives without colour. */
export function StatusChip({ label, tone = 'neutral', dot = false }: StatusChipProps) {
  const modifier = tone === 'neutral' ? '' : ` chip--${tone}`;
  return (
    <span className={`chip${modifier}`}>
      {dot && <span className="chip__dot" aria-hidden="true" />}
      {label}
    </span>
  );
}
