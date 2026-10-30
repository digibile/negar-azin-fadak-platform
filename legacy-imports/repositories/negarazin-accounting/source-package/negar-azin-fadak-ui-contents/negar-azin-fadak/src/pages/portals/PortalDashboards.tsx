import React from "react";
import { PortalShell } from "../../components/layout/PortalShell";
import { PageHeader } from "../../components/patterns/PageHeader";
import { KpiCard, Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/Table";
import { StatusBadge } from "../../components/ui/Badge";
import { salesTrend } from "../../mock/trend";
import { TrendAreaChart } from "../../components/ui/Chart";
import { formatCurrency, formatDate } from "../../lib/utils/format";
import { orders } from "../../mock/commerce";
import { creditRequests, loanCases } from "../../mock/financial";

const GenericPortalDashboard: React.FC<{
  portalKey: string; title: string; kpis: { title: string; value: string; delta?: string; deltaType?: "up" | "down" | "neutral" }[];
}> = ({ portalKey, title, kpis }) => (
  <PortalShell portalKey={portalKey}>
    <PageHeader title={title} breadcrumb={[{ label: "خانه" }, { label: title }]} />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4">
      {kpis.map((k) => <KpiCard key={k.title} {...k} />)}
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <h3 className="mb-1 text-sm font-bold">روند این پرتال</h3>
        <TrendAreaChart data={salesTrend} height={160} />
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-bold">موارد در انتظار</h3>
        <DataTable columns={[{ key: "title", label: "عنوان" }, { key: "status", label: "وضعیت", render: (r) => <StatusBadge status={r.status} /> }]} rows={creditRequests.slice(0, 4)} />
      </Card>
    </div>
  </PortalShell>
);

export const FinancePortalDashboard = () => (
  <GenericPortalDashboard portalKey="finance" title="داشبورد پرتال مالی" kpis={[
    { title: "مانده نقدی", value: formatCurrency(12500000000) }, { title: "چک‌های سررسید", value: "۸" },
    { title: "پرداخت این هفته", value: formatCurrency(1200000000) }, { title: "دریافتی این هفته", value: formatCurrency(2100000000), deltaType: "up", delta: "۶٪" },
  ]} />
);

export const CreditPortalDashboard = () => (
  <GenericPortalDashboard portalKey="credit" title="داشبورد پرتال اعتبار" kpis={[
    { title: "درخواست‌های امروز", value: "۹" }, { title: "نرخ تأیید", value: "۷۲٪", deltaType: "up" },
    { title: "ریسک بالا", value: "۶", deltaType: "down" }, { title: "مانده تسهیلات", value: formatCurrency(45000000000) },
  ]} />
);

export const CommercePortalDashboard = () => (
  <GenericPortalDashboard portalKey="commerce" title="داشبورد پرتال تجارت" kpis={[
    { title: "فروش امروز", value: formatCurrency(482000000) }, { title: "سفارش در انتظار", value: "۳۶" },
    { title: "مشتری جدید", value: "۱۲۸", deltaType: "up" }, { title: "نرخ بازگشت", value: "۲.۴٪", deltaType: "down" },
  ]} />
);

export const MerchantPortalDashboard = () => (
  <GenericPortalDashboard portalKey="merchant" title="داشبورد پذیرنده" kpis={[
    { title: "فروش این ماه", value: formatCurrency(320000000) }, { title: "سفارش‌های من", value: "۴۲" },
    { title: "تسویه در انتظار", value: formatCurrency(85000000) }, { title: "امتیاز فروشگاه", value: "۴.۶" },
  ]} />
);

export const StorePortalDashboard = () => (
  <GenericPortalDashboard portalKey="store" title="داشبورد فروشگاه" kpis={[
    { title: "سفارش امروز", value: "۱۸" }, { title: "موجودی کم", value: "۳", deltaType: "down" },
    { title: "درآمد امروز", value: formatCurrency(64000000) }, { title: "مشتریان حاضر", value: "۲۲" },
  ]} />
);

export const AccountingPortalDashboard = () => (
  <GenericPortalDashboard portalKey="accounting" title="داشبورد حسابداری" kpis={[
    { title: "اسناد ثبت‌نشده", value: "۵" }, { title: "مغایرت بانکی", value: "۲", deltaType: "down" },
    { title: "اسناد این ماه", value: "۱۴۰" }, { title: "مانده حساب‌ها", value: formatCurrency(9800000000) },
  ]} />
);
