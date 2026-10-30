import React from "react";
import { AppShell } from "../../components/layout/AppShell";
import { adminNav } from "../../components/layout/nav.config";
import { EntityListPage } from "../../components/patterns/EntityListPage";
import { PageHeader } from "../../components/patterns/PageHeader";
import { KpiCard, Card } from "../../components/ui/Card";
import { creditRequests } from "../../mock/financial";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { DonutChart } from "../../components/ui/Chart";
import { riskDonut } from "../../mock/trend";

export default function CreditPage() {
  return (
    <AppShell nav={adminNav} portalLabel="مرکز مدیریت نگار آذین فدک">
      <PageHeader title="مدیریت اعتبار" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "اعتبار" }]} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4">
        <KpiCard title="درخواست‌های در انتظار" value="۱۹" icon={<Icon name="card" size={18} />} accent="info" />
        <KpiCard title="نرخ تأیید" value="۷۲٪" deltaType="up" delta="۵٪ رشد" icon={<Icon name="check" size={18} />} accent="success" />
        <KpiCard title="ریسک بالا" value="۶ مورد" deltaType="down" icon={<Icon name="alert" size={18} />} accent="danger" />
        <KpiCard title="اعتبار تخصیص‌یافته" value="۸.۲ میلیارد تومان" icon={<Icon name="coins" size={18} />} accent="primary" />
      </div>
      <Card className="mb-4 max-w-md"><h3 className="mb-1 text-sm font-bold">توزیع ریسک درخواست‌ها</h3><DonutChart data={riskDonut} height={160} /></Card>
      <EntityListPage
        title="درخواست‌های اعتبار" entityLabel="درخواست اعتبار"
        breadcrumb={[]}
        source={creditRequests}
        columns={[
          { key: "title", label: "درخواست" }, { key: "subtitle", label: "متقاضی" },
          { key: "status", label: "وضعیت ارزیابی", render: (r) => <StatusBadge status={r.status} /> },
        ]}
        filters={[{ key: "status", label: "وضعیت", type: "status", options: [{ label: "در انتظار", value: "pending" }, { label: "تأییدشده", value: "approved" }, { label: "ردشده", value: "rejected" }] }]}
        createLabel="ثبت درخواست جدید"
      />
    </AppShell>
  );
}
