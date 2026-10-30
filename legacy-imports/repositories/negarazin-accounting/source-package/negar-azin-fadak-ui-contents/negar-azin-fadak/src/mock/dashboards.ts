export type WidgetType = "kpi" | "chart" | "table" | "list" | "activity" | "calendar";

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  size: "sm" | "md" | "lg";
  x: number;
  y: number;
}

export interface DashboardDef {
  id: string;
  title: string;
  portal: string;
  assignedRoles: string[];
  isDefault?: boolean;
  widgets: DashboardWidget[];
}

export const widgetLibrary: { type: WidgetType; label: string; icon: import("../components/ui/Icon").IconName; desc: string }[] = [
  { type: "kpi", label: "شاخص کلیدی (KPI)", icon: "gauge", desc: "نمایش یک عدد کلیدی با روند تغییر" },
  { type: "chart", label: "نمودار", icon: "chart", desc: "نمودار خطی/ستونی/دایره‌ای" },
  { type: "table", label: "جدول", icon: "table", desc: "نمایش لیست رکوردها به‌صورت جدول" },
  { type: "list", label: "لیست", icon: "list", desc: "لیست ساده آیتم‌ها" },
  { type: "activity", label: "فعالیت‌های اخیر", icon: "activity", desc: "رویدادهای اخیر سیستم" },
  { type: "calendar", label: "تقویم", icon: "calendar", desc: "رویدادها و سرآمدها" },
];

export const mockDashboards: DashboardDef[] = [
  {
    id: "dash-1", title: "داشبورد مدیریت ارشد", portal: "Super Admin", assignedRoles: ["مدیر ارشد سیستم"], isDefault: true,
    widgets: [
      { id: "w1", type: "kpi", title: "فروش امروز", size: "sm", x: 0, y: 0 },
      { id: "w2", type: "kpi", title: "سفارش‌های در انتظار", size: "sm", x: 1, y: 0 },
      { id: "w3", type: "kpi", title: "مشتریان جدید", size: "sm", x: 2, y: 0 },
      { id: "w4", type: "chart", title: "روند فروش ۳۰ روز اخیر", size: "lg", x: 0, y: 1 },
      { id: "w5", type: "activity", title: "آخرین فعالیت‌ها", size: "md", x: 2, y: 1 },
      { id: "w6", type: "table", title: "درخواست‌های اعتبار در انتظار", size: "lg", x: 0, y: 2 },
    ],
  },
  {
    id: "dash-2", title: "داشبورد مالی", portal: "Finance", assignedRoles: ["مدیر مالی"],
    widgets: [
      { id: "w1", type: "kpi", title: "مانده نقدی", size: "sm", x: 0, y: 0 },
      { id: "w2", type: "kpi", title: "چک‌های سررسید این هفته", size: "sm", x: 1, y: 0 },
      { id: "w3", type: "chart", title: "جریان نقدی", size: "lg", x: 0, y: 1 },
    ],
  },
];
