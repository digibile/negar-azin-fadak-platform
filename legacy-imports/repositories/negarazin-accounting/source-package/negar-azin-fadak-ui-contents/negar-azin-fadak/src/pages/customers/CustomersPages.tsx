import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { adminNav } from "../../components/layout/nav.config";
import { EntityListPage } from "../../components/patterns/EntityListPage";
import { PageHeader } from "../../components/patterns/PageHeader";
import { Card } from "../../components/ui/Card";
import { Avatar } from "../../components/ui/Misc";
import { Tabs } from "../../components/ui/Nav";
import { StatusBadge } from "../../components/ui/Badge";
import { customersData, orders } from "../../mock/commerce";
import { formatCurrency, formatDate } from "../../lib/utils/format";

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppShell nav={adminNav} portalLabel="مرکز مدیریت نگار آذین فدک">{children}</AppShell>
);

export const CustomersListPage = () => (
  <Shell>
    <EntityListPage
      title="مشتریان" entityLabel="مشتری"
      breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "مشتریان" }]}
      source={customersData}
      columns={[
        { key: "title", label: "مشتری", render: (r) => <div className="flex items-center gap-2"><Avatar name={r.title} size={28} /><span>{r.title}</span></div> },
        { key: "subtitle", label: "شماره موبایل", render: (r) => <span dir="ltr">{r.subtitle}</span> },
        { key: "status", label: "وضعیت", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      createLabel="افزودن مشتری"
    />
  </Shell>
);

export const CustomerDetailPage = () => {
  const { id } = useParams();
  const customer = customersData.find((c) => c.id === id) ?? customersData[0];
  const [tab, setTab] = useState("orders");
  return (
    <Shell>
      <PageHeader title={customer.title} breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "مشتریان", to: "/customers" }, { label: customer.title }]} />
      <Card className="mb-4 flex items-center gap-4">
        <Avatar name={customer.title} size={56} />
        <div>
          <p className="font-bold">{customer.title}</p>
          <p className="text-sm text-text-muted" dir="ltr">{customer.subtitle}</p>
        </div>
        <StatusBadge status={customer.status} />
      </Card>
      <Tabs tabs={[
        { key: "orders", label: "سفارش‌ها", count: orders.length },
        { key: "wallet", label: "کیف پول" }, { key: "credit", label: "اعتبار" }, { key: "documents", label: "اسناد" }, { key: "activity", label: "فعالیت" }, { key: "communication", label: "ارتباطات" },
      ]} active={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === "orders" && (
          <Card padded={false}>
            {orders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between border-b border-border/70 px-4 py-3 last:border-0 text-sm">
                <span>{o.title}</span><span className="text-text-muted fa-num">{formatDate(o.createdAt)}</span><StatusBadge status={o.status} />
              </div>
            ))}
          </Card>
        )}
        {tab === "wallet" && <Card>موجودی کیف پول: <span className="fa-num font-bold">{formatCurrency(2450000)}</span></Card>}
        {tab === "credit" && <Card>سقف اعتبار فعال: <span className="fa-num font-bold">{formatCurrency(15000000)}</span></Card>}
        {tab === "documents" && <Card>مدارک احراز هویت مشتری در این بخش نمایش داده می‌شود.</Card>}
        {tab === "activity" && <Card>تاریخچه فعالیت مشتری (ورود، خرید، تیکت) در این بخش قرار می‌گیرد.</Card>}
        {tab === "communication" && <Card>پیامک‌ها و ایمیل‌های ارسالی به مشتری در این بخش نمایش داده می‌شود.</Card>}
      </div>
    </Shell>
  );
};
