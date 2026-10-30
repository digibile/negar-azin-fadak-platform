import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export const Breadcrumb: React.FC<{ items: { label: string; to?: string }[] }> = ({ items }) => (
  <nav className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
    {items.map((item, i) => (
      <React.Fragment key={i}>
        {item.to ? (
          <Link to={item.to} className="hover:text-primary-600">{item.label}</Link>
        ) : (
          <span className="text-text font-medium">{item.label}</span>
        )}
        {i < items.length - 1 && <span>/</span>}
      </React.Fragment>
    ))}
  </nav>
);

export const Tabs: React.FC<{ tabs: { key: string; label: string; count?: number }[]; active: string; onChange: (k: string) => void }> = ({ tabs, active, onChange }) => (
  <div className="flex gap-1 overflow-x-auto border-b border-border">
    {tabs.map((t) => (
      <button
        key={t.key}
        onClick={() => onChange(t.key)}
        className={`relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${active === t.key ? "text-primary-600" : "text-text-muted hover:text-text"}`}
      >
        {t.label}{t.count !== undefined && <span className="mr-1 text-xs text-text-muted">({t.count})</span>}
        {active === t.key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary-500" />}
      </button>
    ))}
  </div>
);

export const Accordion: React.FC<{ items: { title: string; content: React.ReactNode }[] }> = ({ items }) => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-border surface-card">
      {items.map((it, i) => (
        <div key={i}>
          <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium">
            {it.title}
            <span className={`transition-transform ${open === i ? "rotate-180" : ""}`}>⌄</span>
          </button>
          {open === i && <div className="px-4 pb-4 text-sm text-text-muted">{it.content}</div>}
        </div>
      ))}
    </div>
  );
};

export const Dropdown: React.FC<{ trigger: React.ReactNode; children: React.ReactNode; align?: "start" | "end" }> = ({ trigger, children, align = "end" }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute z-50 mt-2 min-w-[200px] surface-card shadow-pop py-1 ${align === "end" ? "left-0" : "right-0"}`}>
            {children}
          </div>
        </>
      )}
    </div>
  );
};

export const Tooltip: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <span className="group relative inline-flex">
    {children}
    <span className="pointer-events-none absolute -top-9 right-1/2 z-50 translate-x-1/2 whitespace-nowrap rounded-md bg-text px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
      {label}
    </span>
  </span>
);

export function useActivePath(prefix: string) {
  const loc = useLocation();
  return loc.pathname.startsWith(prefix);
}
