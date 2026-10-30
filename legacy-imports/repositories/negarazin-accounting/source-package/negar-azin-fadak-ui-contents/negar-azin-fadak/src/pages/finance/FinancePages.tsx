import React from "react";
import { AppShell } from "../../components/layout/AppShell";
import { adminNav } from "../../components/layout/nav.config";
import { EntityListPage } from "../../components/patterns/EntityListPage";
import { PageHeader } from "../../components/patterns/PageHeader";
import { KpiCard, Card } from "../../components/ui/Card";
import { bankAccounts, journalEntries } from "../../mock/financial";
import { cashFlowTrend } from "../../mock/trend";
import { TrendAreaChart } from "../../components/ui/Chart";
import { Icon } from "../../components/ui/Icon";
import { formatCurrency } from "../../lib/utils/format";

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppShell nav={adminNav} portalLabel="مرکز مدیریت نگار آذین فدک">{children}</AppShell>
);

export const FinanceDashboardPage = () => (
  <Shell>
    <PageHeader title="داشبورد مالی" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "مالی" }]} />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4">
      <KpiCard title="مانده نقدی کل" value={formatCurrency(12500000000)} icon={<Icon name="wallet" size={18} />} accent="primary" />
      <KpiCard title="چک‌های سررسید این هفته" value="۸ فقره" icon={<Icon name="scroll" size={18} />} accent="warning" />
      <KpiCard title="پرداخت‌های در انتظار" value="۱۴" icon={<Icon name="invoice" size={18} />} accent="info" />
      <KpiCard title="دریافتی‌های این ماه" value={formatCurrency(6200000000)} deltaType="up" delta="۹٪" icon={<Icon name="coins" size={18} />} accent="success" sparkline={cashFlowTrend.slice(-6)} />
    </div>
    <Card><h3 className="mb-1 text-sm font-bold">جریان نقدی</h3><TrendAreaChart data={cashFlowTrend} color="var(--color-success-500)" /></Card>
  </Shell>
);

export const BankAccountsPage = () => (
  <Shell><EntityListPage title="حساب‌های بانکی" entityLabel="حساب بانکی" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "مالی" }, { label: "حساب‌های بانکی" }]} source={bankAccounts} createLabel="افزودن حساب" /></Shell>
);

export const JournalPage = () => (
  <Shell><EntityListPage title="اسناد حسابداری" entityLabel="سند حسابداری" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "مالی" }, { label: "اسناد حسابداری" }]} source={journalEntries} createLabel="ثبت سند جدید" /></Shell>
);
