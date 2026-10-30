import React from "react";
import { MiniLineChart } from "./Chart";
import type { TrendPoint } from "./Chart";

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement> & { padded?: boolean }> = ({ className = "", padded = true, children, ...rest }) => (
  <div className={`surface-card shadow-card ${padded ? "p-4 md:p-5" : ""} ${className}`} {...rest}>
    {children}
  </div>
);

export const KpiCard: React.FC<{
  title: string; value: string; delta?: string; deltaType?: "up" | "down" | "neutral";
  icon?: React.ReactNode; accent?: "primary" | "success" | "warning" | "danger" | "info";
  sparkline?: TrendPoint[];
}> = ({ title, value, delta, deltaType = "neutral", icon, accent = "primary", sparkline }) => {
  const accentMap: Record<string, string> = {
    primary: "bg-primary-50 text-primary-600",
    success: "bg-success-50 text-success-600",
    warning: "bg-warning-50 text-warning-600",
    danger: "bg-danger-50 text-danger-600",
    info: "bg-info-50 text-info-600",
  };
  const deltaMap: Record<string, string> = {
    up: "bg-success-50 text-success-600",
    down: "bg-danger-50 text-danger-600",
    neutral: "bg-bg text-text-muted",
  };
  return (
    <Card className="relative flex flex-col gap-3 overflow-hidden">
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium text-text-muted">{title}</span>
        {icon && <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${accentMap[accent]}`}>{icon}</span>}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-[26px] font-bold tracking-tight fa-num leading-none">{value}</span>
        {sparkline && <div className="h-9 w-20 -mb-1"><MiniLineChart data={sparkline} height={36} color={`var(--color-${accent === "primary" ? "primary" : accent}-500)`} /></div>}
      </div>
      {delta && (
        <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold fa-num ${deltaMap[deltaType]}`}>
          {deltaType === "up" ? "▲" : deltaType === "down" ? "▼" : "•"} {delta}
        </span>
      )}
    </Card>
  );
};
