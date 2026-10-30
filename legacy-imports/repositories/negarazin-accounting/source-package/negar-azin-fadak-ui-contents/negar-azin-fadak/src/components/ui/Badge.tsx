import React from "react";
import type { EntityStatus } from "../../lib/api/types";

export const Badge: React.FC<{ children: React.ReactNode; color?: "primary" | "success" | "warning" | "danger" | "info" | "muted" }> = ({ children, color = "muted" }) => {
  const map: Record<string, string> = {
    primary: "bg-primary-50 text-primary-700",
    success: "bg-success-50 text-success-600",
    warning: "bg-warning-50 text-warning-600",
    danger: "bg-danger-50 text-danger-600",
    info: "bg-info-50 text-info-600",
    muted: "bg-bg text-text-muted border border-border",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${map[color]}`}>{children}</span>;
};

const STATUS_MAP: Record<EntityStatus, { label: string; color: any }> = {
  active: { label: "فعال", color: "success" },
  inactive: { label: "غیرفعال", color: "muted" },
  pending: { label: "در انتظار", color: "warning" },
  approved: { label: "تأییدشده", color: "success" },
  rejected: { label: "ردشده", color: "danger" },
  processing: { label: "در حال پردازش", color: "info" },
  draft: { label: "پیش‌نویس", color: "muted" },
};

export const StatusBadge: React.FC<{ status?: EntityStatus }> = ({ status }) => {
  if (!status) return null;
  const s = STATUS_MAP[status] ?? { label: status, color: "muted" };
  return <Badge color={s.color}>{s.label}</Badge>;
};
