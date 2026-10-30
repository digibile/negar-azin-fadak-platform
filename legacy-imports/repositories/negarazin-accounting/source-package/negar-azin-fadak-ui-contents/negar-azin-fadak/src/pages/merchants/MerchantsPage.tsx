import React from "react";
import { AppShell } from "../../components/layout/AppShell";
import { adminNav } from "../../components/layout/nav.config";
import { EntityListPage } from "../../components/patterns/EntityListPage";
import { merchants } from "../../mock/commerce";

export default function MerchantsPage() {
  return (
    <AppShell nav={adminNav} portalLabel="مرکز مدیریت نگار آذین فدک">
      <EntityListPage title="پذیرندگان / فروشندگان" entityLabel="پذیرنده" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "پذیرندگان" }]} source={merchants} createLabel="افزودن پذیرنده" />
    </AppShell>
  );
}
