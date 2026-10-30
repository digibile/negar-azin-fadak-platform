import React from "react";
import { formatNumber } from "../../lib/utils/format";

export const Pagination: React.FC<{ page: number; pageSize: number; total: number; onChange: (p: number) => void }> = ({ page, pageSize, total, onChange }) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3 text-sm text-text-muted">
      <span>نمایش {formatNumber((page - 1) * pageSize + 1)} تا {formatNumber(Math.min(page * pageSize, total))} از {formatNumber(total)} مورد</span>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="h-8 w-8 rounded-md border border-border disabled:opacity-40 hover:bg-bg">›</button>
        {Array.from({ length: pages }).slice(0, 6).map((_, i) => (
          <button
            key={i}
            onClick={() => onChange(i + 1)}
            className={`h-8 w-8 rounded-md border text-xs fa-num ${page === i + 1 ? "border-primary-500 bg-primary-50 text-primary-700 font-semibold" : "border-border hover:bg-bg"}`}
          >
            {formatNumber(i + 1)}
          </button>
        ))}
        <button disabled={page >= pages} onClick={() => onChange(page + 1)} className="h-8 w-8 rounded-md border border-border disabled:opacity-40 hover:bg-bg">‹</button>
      </div>
    </div>
  );
};
