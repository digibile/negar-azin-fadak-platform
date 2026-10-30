import type { ReactNode } from 'react';

interface PageHeaderProps {
  readonly title: string;
  readonly lead?: string;
  readonly actions?: ReactNode;
}

/** The heading block of a screen: what it is, in one line, and what it is for. */
export function PageHeader({ title, lead, actions }: PageHeaderProps) {
  return (
    <div className="portal__head">
      <div>
        <h1>{title}</h1>
        {lead !== undefined && <p className="portal__head-lead">{lead}</p>}
      </div>
      {actions !== undefined && <div className="cluster cluster--tight">{actions}</div>}
    </div>
  );
}
