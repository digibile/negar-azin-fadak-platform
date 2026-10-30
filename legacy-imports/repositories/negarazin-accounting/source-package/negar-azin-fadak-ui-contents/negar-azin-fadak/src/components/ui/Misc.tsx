import React from "react";
import { formatCurrency, formatNumber } from "../../lib/utils/format";

export const Price: React.FC<{ value: number; oldValue?: number }> = ({ value, oldValue }) => (
  <div className="flex flex-col items-end">
    {oldValue && <span className="text-xs text-text-muted line-through fa-num">{formatCurrency(oldValue)}</span>}
    <span className="text-sm font-bold text-text fa-num">{formatCurrency(value)}</span>
  </div>
);

export const Rating: React.FC<{ value: number; count?: number }> = ({ value, count }) => (
  <div className="flex items-center gap-1 text-xs text-warning-600">
    <span>★</span>
    <span className="fa-num font-medium">{value.toFixed(1)}</span>
    {count !== undefined && <span className="text-text-muted">({formatNumber(count)})</span>}
  </div>
);

export const Avatar: React.FC<{ name: string; size?: number; src?: string }> = ({ name, size = 36, src }) => {
  const initials = name.trim().split(" ").slice(0, 2).map((w) => w[0]).join("");
  if (src) return <img src={src} width={size} height={size} className="rounded-full object-cover" alt={name} />;
  return (
    <span style={{ width: size, height: size }} className="flex items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold shrink-0">
      {initials}
    </span>
  );
};

export const Stepper: React.FC<{ steps: string[]; current: number }> = ({ steps, current }) => (
  <div className="flex items-center">
    {steps.map((s, i) => (
      <React.Fragment key={i}>
        <div className="flex flex-col items-center gap-1.5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold fa-num ${i < current ? "bg-success-500 text-white" : i === current ? "bg-primary-500 text-white" : "bg-bg text-text-muted border border-border"}`}>
            {i < current ? "✓" : i + 1}
          </div>
          <span className="text-xs text-text-muted whitespace-nowrap">{s}</span>
        </div>
        {i < steps.length - 1 && <div className={`h-0.5 w-10 md:w-16 ${i < current ? "bg-success-500" : "bg-border"}`} />}
      </React.Fragment>
    ))}
  </div>
);

export const Timeline: React.FC<{ items: { title: string; time: string; description?: string; color?: string }[] }> = ({ items }) => (
  <div className="relative ms-3 border-e-2 border-border pe-6">
    {items.map((it, i) => (
      <div key={i} className="relative pb-6 last:pb-0">
        <span className="absolute -right-[1.45rem] top-0.5 h-3 w-3 rounded-full border-2 border-surface" style={{ background: it.color ?? "var(--color-primary-500)" }} />
        <p className="text-sm font-medium">{it.title}</p>
        <p className="text-xs text-text-muted">{it.time}</p>
        {it.description && <p className="mt-1 text-xs text-text-muted">{it.description}</p>}
      </div>
    ))}
  </div>
);
