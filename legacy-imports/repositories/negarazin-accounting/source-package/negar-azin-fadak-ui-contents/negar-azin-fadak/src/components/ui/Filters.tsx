import React, { useState } from "react";
import type { FilterField } from "../../lib/api/types";
import { Input, Select } from "./Form";
import { Button } from "./Button";

export const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder = "جستجو..." }) => (
  <div className="relative flex-1 min-w-[220px]">
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">🔎</span>
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pr-9" />
  </div>
);

export const FilterBar: React.FC<{
  fields: FilterField[];
  values: Record<string, string | undefined>;
  onChange: (key: string, value: string | undefined) => void;
  onReset?: () => void;
}> = ({ fields, values, onChange, onReset }) => (
  <div className="flex flex-wrap items-end gap-3">
    {fields.map((f) => (
      <div key={f.key} className="min-w-[160px]">
        <label className="mb-1 block text-xs text-text-muted">{f.label}</label>
        {f.type === "select" || f.type === "status" ? (
          <Select
            value={values[f.key] ?? ""}
            onChange={(e) => onChange(f.key, e.target.value || undefined)}
            options={[{ label: "همه", value: "" }, ...(f.options ?? [])]}
          />
        ) : (
          <Input value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value || undefined)} placeholder={f.label} />
        )}
      </div>
    ))}
    {onReset && <Button variant="ghost" size="md" onClick={onReset}>حذف فیلترها</Button>}
  </div>
);

export const SortSelect: React.FC<{ value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }> = ({ value, onChange, options }) => (
  <Select value={value} onChange={(e) => onChange(e.target.value)} options={options} className="w-48" />
);
