import React from "react";

export const Field: React.FC<{ label: string; hint?: string; required?: boolean; error?: string; children: React.ReactNode }> = ({ label, hint, required, error, children }) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-sm font-medium text-text">
      {label} {required && <span className="text-danger-500">*</span>}
    </span>
    {children}
    {hint && !error && <span className="text-xs text-text-muted">{hint}</span>}
    {error && <span className="text-xs text-danger-600">{error}</span>}
  </label>
);

const baseInput = "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition-colors focus:border-primary-400 focus-ring placeholder:text-text-muted/70";

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = "", ...rest }) => (
  <input className={`${baseInput} ${className}`} {...rest} />
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className = "", ...rest }) => (
  <textarea className={`${baseInput} min-h-[96px] py-2 ${className}`} {...rest} />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { options: { label: string; value: string }[] }> = ({ options, className = "", ...rest }) => (
  <select className={`${baseInput} ${className}`} {...rest}>
    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

export const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string }> = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none">
    <span
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-primary-500" : "bg-border"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[-1.375rem]" : "translate-x-[-0.125rem]"} right-full`} />
    </span>
    {label && <span className="text-sm">{label}</span>}
  </label>
);

export const Checkbox: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = "", ...rest }) => (
  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
    <input type="checkbox" className={`h-4 w-4 rounded border-border text-primary-500 focus-ring ${className}`} {...rest} />
    {label}
  </label>
);
