import React from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { toFaDigits } from "../../lib/utils/format";

const gridColor = "var(--color-border)";
const mutedColor = "var(--color-text-muted)";

const axisProps = {
  tick: { fill: mutedColor, fontSize: 11, fontFamily: "Vazirmatn" },
  tickLine: false,
  axisLine: { stroke: gridColor },
};

const TooltipBox: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-pop" dir="rtl">
      {label && <p className="mb-1 font-medium text-text-muted">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="flex items-center gap-1.5 font-semibold">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {toFaDigits(typeof p.value === "number" ? p.value.toLocaleString("en-US") : p.value)}
        </p>
      ))}
    </div>
  );
};

export interface TrendPoint { label: string; value: number; }

export const TrendAreaChart: React.FC<{ data: TrendPoint[]; color?: string; height?: number }> = ({ data, color = "var(--color-primary-500)", height = 190 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -18 }}>
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 6" />
      <XAxis dataKey="label" {...axisProps} />
      <YAxis {...axisProps} width={44} tickFormatter={(v) => toFaDigits(v)} />
      <Tooltip content={<TooltipBox />} cursor={{ stroke: color, strokeDasharray: "3 3" }} />
      <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.4} fill="url(#trendFill)" dot={false} activeDot={{ r: 4 }} />
    </AreaChart>
  </ResponsiveContainer>
);

export const CompareBarChart: React.FC<{ data: TrendPoint[]; color?: string; height?: number }> = ({ data, color = "var(--color-primary-500)", height = 190 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -18 }} barCategoryGap="28%">
      <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 6" />
      <XAxis dataKey="label" {...axisProps} />
      <YAxis {...axisProps} width={44} tickFormatter={(v) => toFaDigits(v)} />
      <Tooltip content={<TooltipBox />} cursor={{ fill: "var(--color-bg)" }} />
      <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={28} />
    </BarChart>
  </ResponsiveContainer>
);

export const MiniLineChart: React.FC<{ data: TrendPoint[]; color?: string; height?: number }> = ({ data, color = "var(--color-success-500)", height = 56 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
      <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);

const DONUT_COLORS = ["var(--color-primary-500)", "var(--color-success-500)", "var(--color-warning-500)", "var(--color-info-500)", "var(--color-secondary-500)"];

export const DonutChart: React.FC<{ data: { label: string; value: number }[]; height?: number }> = ({ data, height = 190 }) => (
  <div className="flex items-center gap-4">
    <ResponsiveContainer width={height} height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="98%" paddingAngle={3} stroke="none">
          {data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
        </Pie>
        <Tooltip content={<TooltipBox />} />
      </PieChart>
    </ResponsiveContainer>
    <div className="flex flex-col gap-2 text-xs">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
          <span className="text-text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  </div>
);
