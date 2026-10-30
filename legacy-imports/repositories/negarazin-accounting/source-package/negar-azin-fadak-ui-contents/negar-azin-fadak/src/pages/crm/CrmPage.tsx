import React from "react";
import { AppShell } from "../../components/layout/AppShell";
import { adminNav } from "../../components/layout/nav.config";
import { EntityListPage } from "../../components/patterns/EntityListPage";
import { PageHeader } from "../../components/patterns/PageHeader";
import { KpiCard } from "../../components/ui/Card";
import { Icon } from "../../components/ui/Icon";
import { crmActivities } from "../../mock/financial";

export default function CrmPage() {
  return (
    <AppShell nav={adminNav} portalLabel="مرکز مدیریت نگار آذین فدک">
      <PageHeader title="CRM" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "CRM" }]} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4">
        <KpiCard title="فعالیت‌های امروز" value="۱۴" icon={<Icon name="activity" size={18} />} accent="primary" />
        <KpiCard title="کمپین‌های فعال" value="۳" icon={<Icon name="sparkle" size={18} />} accent="info" />
        <KpiCard title="پیگیری‌های عقب‌افتاده" value="۵" deltaType="down" icon={<Icon name="alert" size={18} />} accent="danger" />
        <KpiCard title="نرخ تعامل مشتری" value="۶۴٪" deltaType="up" icon={<Icon name="handshake" size={18} />} accent="success" />
      </div>
      <EntityListPage title="فعالیت‌های CRM" entityLabel="فعالیت" breadcrumb={[]} source={crmActivities} createLabel="ثبت فعالیت جدید" />
    </AppShell>
  );
}
