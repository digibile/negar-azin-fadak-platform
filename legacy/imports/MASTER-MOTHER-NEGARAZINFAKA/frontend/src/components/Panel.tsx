import type { ReactNode } from 'react';

interface PanelProps {
  readonly title: string;
  /** Secondary line under the title explaining what the panel holds. */
  readonly hint?: string;
  /** Controls rendered at the end of the header row. */
  readonly actions?: ReactNode;
  /** Drops the body padding, for a table that runs to the panel edges. */
  readonly flush?: boolean;
  readonly children: ReactNode;
}

/** A titled surface. Every grouped screen on the platform sits in one of these. */
export function Panel({ title, hint, actions, flush = false, children }: PanelProps) {
  return (
    <section className="panel">
      <header className="panel__header">
        <div className="panel__title">
          <h2 className="panel__heading">{title}</h2>
          {hint !== undefined && <p className="panel__hint">{hint}</p>}
        </div>
        {actions !== undefined && <div className="cluster cluster--tight">{actions}</div>}
      </header>
      <div className={flush ? 'panel__body panel__body--flush' : 'panel__body'}>{children}</div>
    </section>
  );
}
