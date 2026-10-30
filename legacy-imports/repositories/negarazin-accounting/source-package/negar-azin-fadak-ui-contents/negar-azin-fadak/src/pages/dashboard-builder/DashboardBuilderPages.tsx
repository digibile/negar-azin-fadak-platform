import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { adminNav } from "../../components/layout/nav.config";
import { PageHeader } from "../../components/patterns/PageHeader";
import { Card, KpiCard } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Drawer } from "../../components/ui/Overlay";
import { Checkbox, Select, Field } from "../../components/ui/Form";
import { mockDashboards, widgetLibrary } from "../../mock/dashboards";
import type { DashboardWidget, WidgetType } from "../../mock/dashboards";
import { useToast } from "../../components/ui/Toast";
import { roles } from "../../mock/users";
import { tableMock } from "../../mock/widget-demo";
import { salesTrend } from "../../mock/trend";
import { TrendAreaChart } from "../../components/ui/Chart";
import { Icon } from "../../components/ui/Icon";

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppShell nav={adminNav} portalLabel="مرکز مدیریت نگار آذین فدک">{children}</AppShell>
);

export const DashboardListPage = () => {
  const { push } = useToast();
  return (
    <Shell>
      <PageHeader
        title="مدیریت داشبوردها" description="داشبوردهای هر پرتال و نقش را بسازید، ویرایش و به کاربران اختصاص دهید."
        breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "مدیریت داشبوردها" }]}
        actions={<Button icon="＋" onClick={() => push("info", "ساخت داشبورد جدید (نمایشی).")}>داشبورد جدید</Button>}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockDashboards.map((d) => (
          <Card key={d.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">{d.title}</p>
              {d.isDefault && <Badge color="success">پیش‌فرض</Badge>}
            </div>
            <p className="text-xs text-text-muted">پرتال: {d.portal}</p>
            <div className="flex flex-wrap gap-1">
              {d.assignedRoles.map((r) => <Badge key={r} color="info">{r}</Badge>)}
            </div>
            <p className="text-xs text-text-muted">{d.widgets.length} ویجت فعال</p>
            <div className="flex gap-2">
              <Link to={`/dashboard-builder/${d.id}`} className="flex-1"><Button size="sm" fullWidth>ویرایش در Builder</Button></Link>
              <Button size="sm" variant="outline">پیش‌نمایش</Button>
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
};

const WidgetRenderer: React.FC<{ w: DashboardWidget; onRemove: () => void; onConfigure: () => void }> = ({ w, onRemove, onConfigure }) => {
  const sizeClass = w.size === "lg" ? "md:col-span-2" : w.size === "md" ? "md:col-span-1" : "col-span-1";
  return (
    <div className={`surface-card p-4 relative group ${sizeClass}`}>
      <div className="absolute left-2 top-2 hidden group-hover:flex gap-1">
        <button onClick={onConfigure} className="rounded bg-surface border border-border px-1.5 py-0.5 text-xs">⚙️</button>
        <button onClick={onRemove} className="rounded bg-surface border border-border px-1.5 py-0.5 text-xs text-danger-600">✕</button>
      </div>
      <p className="mb-3 text-sm font-semibold">{w.title}</p>
      {w.type === "kpi" && <div className="text-2xl font-bold fa-num">۱۲۸</div>}
      {w.type === "chart" && <TrendAreaChart data={salesTrend} height={140} />}
      {w.type === "table" && (
        <table className="w-full text-xs"><tbody>
          {tableMock.map((r, i) => <tr key={i} className="border-b border-border/60 last:border-0"><td className="py-1.5">{r.a}</td><td className="py-1.5 text-text-muted">{r.b}</td></tr>)}
        </tbody></table>
      )}
      {w.type === "list" && <ul className="space-y-1.5 text-xs text-text-muted">{tableMock.map((r, i) => <li key={i}>• {r.a}</li>)}</ul>}
      {w.type === "activity" && <ul className="space-y-2 text-xs text-text-muted">{["ورود کاربر جدید", "ثبت سفارش", "تغییر وضعیت اعتبار"].map((t, i) => <li key={i} className="flex items-center gap-2"><Icon name="activity" size={13} />{t}</li>)}</ul>}
      {w.type === "calendar" && <div className="grid grid-cols-7 gap-1 text-[10px] text-center text-text-muted">{Array.from({ length: 21 }).map((_, i) => <div key={i} className="py-1 rounded bg-bg">{i + 1}</div>)}</div>}
    </div>
  );
};

export const DashboardBuilderPage = () => {
  const { id } = useParams();
  const dash = mockDashboards.find((d) => d.id === id) ?? mockDashboards[0];
  const [widgets, setWidgets] = useState<DashboardWidget[]>(dash.widgets);
  const [libOpen, setLibOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const { push } = useToast();

  const addWidget = (type: WidgetType, label: string) => {
    setWidgets((prev) => [...prev, { id: "w" + Date.now(), type, title: label, size: "md", x: 0, y: 0 }]);
    push("success", `ویجت «${label}» اضافه شد.`);
    setLibOpen(false);
  };

  return (
    <Shell>
      <PageHeader
        title={`Dashboard Builder — ${dash.title}`}
        breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "مدیریت داشبوردها", to: "/dashboard-builder" }, { label: "Builder" }]}
        actions={<>
          <Button variant="outline" onClick={() => setAssignOpen(true)}>تخصیص دسترسی</Button>
          <Button variant="outline" onClick={() => setLibOpen(true)}>➕ افزودن ویجت</Button>
          <Button variant="success" onClick={() => push("success", "چیدمان داشبورد ذخیره شد (نمایشی).")}>ذخیره چیدمان</Button>
        </>}
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {widgets.map((w) => (
          <WidgetRenderer key={w.id} w={w} onRemove={() => setWidgets((prev) => prev.filter((x) => x.id !== w.id))} onConfigure={() => push("info", "پنل تنظیمات ویجت (نمایشی).")} />
        ))}
        <button onClick={() => setLibOpen(true)} className="col-span-1 grid min-h-[120px] place-items-center rounded-lg border-2 border-dashed border-border text-text-muted hover:border-primary-400 hover:text-primary-600">
          ➕ افزودن ویجت جدید
        </button>
      </div>

      <Drawer open={libOpen} onClose={() => setLibOpen(false)} title="کتابخانه ویجت‌ها (Widget Library)">
        <div className="grid grid-cols-1 gap-2">
          {widgetLibrary.map((w) => (
            <button key={w.type} onClick={() => addWidget(w.type, w.label)} className="flex items-center gap-3 rounded-md border border-border p-3 text-right hover:border-primary-400 hover:bg-primary-50/40">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-600"><Icon name={w.icon} size={18} /></span>
              <span>
                <p className="text-sm font-medium">{w.label}</p>
                <p className="text-xs text-text-muted">{w.desc}</p>
              </span>
            </button>
          ))}
        </div>
      </Drawer>

      <Drawer open={assignOpen} onClose={() => setAssignOpen(false)} title="تخصیص داشبورد به نقش / پرتال / کاربر"
        footer={<Button onClick={() => { push("success", "تخصیص دسترسی ذخیره شد."); setAssignOpen(false); }}>ذخیره</Button>}
      >
        <div className="flex flex-col gap-4">
          <Field label="پرتال"><Select options={[{ label: "Super Admin", value: "sa" }, { label: "Finance", value: "fin" }, { label: "Credit", value: "cr" }]} /></Field>
          <div>
            <p className="mb-2 text-sm font-medium">تخصیص به نقش‌ها</p>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((r) => <Checkbox key={r.id} label={r.title} defaultChecked={dash.assignedRoles.includes(r.title)} />)}
            </div>
          </div>
          <Checkbox label="تنظیم به‌عنوان داشبورد پیش‌فرض این پرتال" defaultChecked={dash.isDefault} />
        </div>
      </Drawer>
    </Shell>
  );
};
