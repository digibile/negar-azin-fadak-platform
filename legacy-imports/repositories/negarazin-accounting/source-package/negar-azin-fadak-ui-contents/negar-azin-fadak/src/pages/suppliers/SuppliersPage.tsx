import React from "react";
import { AppShell } from "../../components/layout/AppShell";
import { adminNav } from "../../components/layout/nav.config";
import { EntityListPage } from "../../components/patterns/EntityListPage";
import { suppliers } from "../../mock/commerce";

export default function SuppliersPage() {
  return (
    <AppShell nav={adminNav} portalLabel="مرکز مدیریت نگار آذین فدک">
      <EntityListPage title="تأمین‌کنندگان" entityLabel="تأمین‌کننده" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "تأمین‌کنندگان" }]} source={suppliers} createLabel="افزودن تأمین‌کننده" />
    </AppShell>
  );
}
