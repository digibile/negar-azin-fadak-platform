import React, { useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { adminNav } from "../../components/layout/nav.config";
import { PageHeader } from "../../components/patterns/PageHeader";
import { Card, KpiCard } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select, Input } from "../../components/ui/Form";
import { Tabs } from "../../components/ui/Nav";
import { salesTrend } from "../../mock/trend";
import { TrendAreaChart } from "../../components/ui/Chart";
import { formatCurrency } from "../../lib/utils/format";

const REPORT_TABS = [
  { key: "sales", label: "فروش" }, { key: "purchase", label: "خرید" }, { key: "inventory", label: "موجودی" },
  { key: "customers", label: "مشتریان" }, { key: "financial", label: "مالی" }, { key: "credit", label: "اعتبار" },
  { key: "loans", label: "تسهیلات" }, { key: "crm", label: "CRM" }, { key: "audit", label: "Audit" },
];

export default function ReportsPage() {
  const [tab, setTab] = useState("sales");
  return (
    <AppShell nav={adminNav} portalLabel="مرکز مدیریت نگار آذین فدک">
      <PageHeader title="مرکز گزارش‌ها" description="گزارش‌های مدیریتی، فروش، خرید، موجودی، مالی، اعتبار، تسهیلات، CRM و Audit"
        breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "گزارش‌ها" }]}
        actions={<><Button variant="outline">🖨️ چاپ</Button><Button variant="outline">⬇️ خروجی Excel</Button></>}
      />
      <Tabs tabs={REPORT_TABS} active={tab} onChange={setTab} />
      <div className="mt-4 mb-4 flex flex-wrap items-end gap-3">
        <div><label className="mb-1 block text-xs text-text-muted">از تاریخ</label><Input placeholder="۱۴۰۴/۰۱/۰۱" /></div>
        <div><label className="mb-1 block text-xs text-text-muted">تا تاریخ</label><Input placeholder="۱۴۰۴/۰۶/۳۱" /></div>
        <div><label className="mb-1 block text-xs text-text-muted">شعبه</label><Select options={[{ label: "همه شعبه‌ها", value: "" }, { label: "تهران", value: "th" }]} /></div>
        <Button>اعمال فیلتر</Button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4">
        <KpiCard title="جمع کل دوره" value={formatCurrency(9840000000)} />
        <KpiCard title="میانگین روزانه" value={formatCurrency(328000000)} />
        <KpiCard title="بیشترین مقدار" value={formatCurrency(1200000000)} />
        <KpiCard title="تعداد رکورد" value="۱٬۲۴۰" />
      </div>
      <Card>
        <h3 className="mb-1 text-sm font-bold">نمودار روند دوره گزارش — {REPORT_TABS.find((t) => t.key === tab)?.label}</h3>
        <TrendAreaChart data={salesTrend} />
      </Card>
    </AppShell>
  );
}
