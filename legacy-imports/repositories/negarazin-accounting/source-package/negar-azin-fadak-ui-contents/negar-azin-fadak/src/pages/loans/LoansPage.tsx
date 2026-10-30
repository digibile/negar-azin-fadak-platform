import React from "react";
import { AppShell } from "../../components/layout/AppShell";
import { adminNav } from "../../components/layout/nav.config";
import { EntityListPage } from "../../components/patterns/EntityListPage";
import { PageHeader } from "../../components/patterns/PageHeader";
import { KpiCard } from "../../components/ui/Card";
import { Icon } from "../../components/ui/Icon";
import { loanCases } from "../../mock/financial";

export default function LoansPage() {
  return (
    <AppShell nav={adminNav} portalLabel="مرکز مدیریت نگار آذین فدک">
      <PageHeader title="مدیریت تسهیلات" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "تسهیلات" }]} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4">
        <KpiCard title="پرونده‌های فعال" value="۱۹" icon={<Icon name="bank" size={18} />} accent="primary" />
        <KpiCard title="اقساط معوق" value="۴ مورد" deltaType="down" icon={<Icon name="alert" size={18} />} accent="danger" />
        <KpiCard title="مانده کل تسهیلات" value="۴۵.۱ میلیارد تومان" icon={<Icon name="coins" size={18} />} accent="info" />
        <KpiCard title="وثیقه‌های ثبت‌شده" value="۲۲" icon={<Icon name="shield-check" size={18} />} accent="success" />
      </div>
      <EntityListPage title="پرونده‌های تسهیلات" entityLabel="پرونده تسهیلات" breadcrumb={[]} source={loanCases} createLabel="ثبت پرونده جدید" />
    </AppShell>
  );
}
