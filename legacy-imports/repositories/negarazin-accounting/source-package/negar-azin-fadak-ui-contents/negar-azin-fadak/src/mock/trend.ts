import { toFaDigits } from "../lib/utils/format";
import type { TrendPoint } from "../components/ui/Chart";

const WEEKDAYS = ["شنبه", "یک‌شنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

export function last10Days(values: number[]): TrendPoint[] {
  return values.map((v, i) => ({ label: toFaDigits(30 - values.length + i + 1), value: v }));
}

export function last7Weekdays(values: number[]): TrendPoint[] {
  return values.map((v, i) => ({ label: WEEKDAYS[i % 7], value: v }));
}

export const salesTrend = last10Days([320, 410, 380, 460, 520, 480, 610, 560, 640, 700]);
export const ordersTrend = last7Weekdays([42, 58, 51, 66, 74, 39, 61]);
export const cashFlowTrend = last10Days([210, 260, 240, 300, 280, 340, 320, 380, 360, 410]);
export const inventoryTrend = last7Weekdays([120, 135, 128, 142, 150, 138, 160]);
export const riskDonut = [
  { label: "ریسک پایین", value: 62 },
  { label: "ریسک متوسط", value: 28 },
  { label: "ریسک بالا", value: 10 },
];
export const categoryDonut = [
  { label: "دیجیتال", value: 38 },
  { label: "خانه و آشپزخانه", value: 24 },
  { label: "مد و پوشاک", value: 20 },
  { label: "سایر", value: 18 },
];
