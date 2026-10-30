import React from "react";
import type { Column } from "../../lib/api/types";
import { SkeletonTable } from "./States";

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  selectable?: boolean;
}

export function DataTable<T extends { id: string }>({ columns, rows, loading, onRowClick, rowActions, selectable }: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="surface-card overflow-hidden p-4">
        <SkeletonTable />
      </div>
    );
  }
  return (
    <div className="surface-card overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border bg-bg/60 text-right text-text-muted">
            {selectable && <th className="w-10 px-4 py-3"><input type="checkbox" /></th>}
            {columns.map((c) => (
              <th key={c.key} className="whitespace-nowrap px-4 py-3 font-medium" style={{ width: c.width }}>{c.label}</th>
            ))}
            {rowActions && <th className="px-4 py-3 text-left">عملیات</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-border/70 last:border-0 hover:bg-primary-50/60 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
            >
              {selectable && <td className="px-4 py-3"><input type="checkbox" onClick={(e) => e.stopPropagation()} /></td>}
              {columns.map((c) => (
                <td key={c.key} className="whitespace-nowrap px-4 py-3">
                  {c.render ? c.render(row) : (row as any)[c.key]}
                </td>
              ))}
              {rowActions && (
                <td className="px-4 py-3 text-left" onClick={(e) => e.stopPropagation()}>
                  {rowActions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
