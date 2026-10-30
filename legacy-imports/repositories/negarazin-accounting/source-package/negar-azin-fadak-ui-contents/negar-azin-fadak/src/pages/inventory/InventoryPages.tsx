import React from "react";
import { AppShell } from "../../components/layout/AppShell";
import { adminNav } from "../../components/layout/nav.config";
import { EntityListPage } from "../../components/patterns/EntityListPage";
import { PageHeader } from "../../components/patterns/PageHeader";
import { Card, KpiCard } from "../../components/ui/Card";
import { warehouses, stockMovements, lowStockItems } from "../../mock/inventory";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { CompareBarChart } from "../../components/ui/Chart";
import { inventoryTrend } from "../../mock/trend";

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppShell nav={adminNav} portalLabel="مرکز مدیریت نگار آذین فدک">{children}</AppShell>
);

export const InventoryDashboardPage = () => (
  <Shell>
    <PageHeader title="داشبورد موجودی" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "موجودی" }]} />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4">
      <KpiCard title="تعداد انبارها" value="۷" icon={<Icon name="warehouse" size={18} />} accent="primary" />
      <KpiCard title="کالاهای کم‌موجود" value="۱۲" deltaType="down" delta="نیاز به سفارش" icon={<Icon name="alert" size={18} />} accent="danger" />
      <KpiCard title="ارزش کل موجودی" value="۳۲.۴ میلیارد تومان" icon={<Icon name="boxes" size={18} />} accent="success" />
      <KpiCard title="گردش کالا این هفته" value="۲۶ سند" icon={<Icon name="repeat" size={18} />} accent="info" />
    </div>
    <Card>
      <h3 className="mb-1 text-sm font-bold">روند گردش کالا (هفتگی)</h3>
      <CompareBarChart data={inventoryTrend} color="var(--color-info-500)" />
    </Card>
  </Shell>
);

export const WarehousesPage = () => (
  <Shell>
    <EntityListPage title="انبارها" entityLabel="انبار" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "موجودی" }, { label: "انبارها" }]} source={warehouses} createLabel="افزودن انبار" />
  </Shell>
);

export const StockMovementsPage = () => (
  <Shell>
    <EntityListPage title="گردش کالا (رسید/حواله انبار)" entityLabel="سند انبار" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "موجودی" }, { label: "گردش کالا" }]} source={stockMovements} createLabel="ثبت سند جدید" />
  </Shell>
);

export const LowStockPage = () => (
  <Shell>
    <EntityListPage
      title="کالاهای کم‌موجود" entityLabel="کالا"
      breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "موجودی" }, { label: "کالاهای کم‌موجود" }]}
      source={lowStockItems}
      columns={[
        { key: "title", label: "کالا" },
        { key: "status", label: "وضعیت انبار", render: () => <StatusBadge status="pending" /> },
      ]}
      createLabel="ثبت سفارش خرید"
    />
  </Shell>
);
