import React from "react";
import { AppShell } from "../../components/layout/AppShell";
import { adminNav } from "../../components/layout/nav.config";
import { PageHeader } from "../../components/patterns/PageHeader";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { auditLogs } from "../../mock/financial";
import { formatDateTime } from "../../lib/utils/format";

export default function AuditPage() {
  return (
    <AppShell nav={adminNav} portalLabel="مرکز مدیریت نگار آذین فدک">
      <PageHeader title="گزارش رویدادها (Audit Log)" description="رویدادهای امنیتی، ورود کاربران و تغییرات رکوردها" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "Audit" }]} />
      <Card padded={false} className="overflow-x-auto">
        <DataTable
          columns={[
            { key: "title", label: "رویداد" },
            { key: "subtitle", label: "نوع عملیات", render: (r) => <Badge color="info">{r.subtitle}</Badge> },
            { key: "user", label: "کاربر", render: () => "سارا محمدی" },
            { key: "ip", label: "IP", render: () => <span dir="ltr">192.168.1.24</span> },
            { key: "device", label: "دستگاه", render: () => "Chrome / Windows" },
            { key: "createdAt", label: "زمان", render: (r) => <span className="fa-num">{formatDateTime(r.createdAt)}</span> },
          ]}
          rows={auditLogs}
          rowActions={() => <button className="text-xs text-primary-600">مشاهده Before/After</button>}
        />
      </Card>
    </AppShell>
  );
}
