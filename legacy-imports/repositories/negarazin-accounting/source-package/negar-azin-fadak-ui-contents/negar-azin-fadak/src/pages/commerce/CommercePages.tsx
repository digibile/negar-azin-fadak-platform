import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { adminNav } from "../../components/layout/nav.config";
import { EntityListPage } from "../../components/patterns/EntityListPage";
import { PageHeader } from "../../components/patterns/PageHeader";
import { Card, KpiCard } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import { Price, Rating, Timeline, Stepper } from "../../components/ui/Misc";
import { Tabs } from "../../components/ui/Nav";
import { products, categories, orders, purchases, suppliers } from "../../mock/commerce";
import { formatCurrency, formatDateTime } from "../../lib/utils/format";
import { salesTrend, categoryDonut } from "../../mock/trend";
import { TrendAreaChart, DonutChart } from "../../components/ui/Chart";
import { Icon } from "../../components/ui/Icon";

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppShell nav={adminNav} portalLabel="مرکز مدیریت نگار آذین فدک">{children}</AppShell>
);

export const ProductsAdminPage = () => (
  <Shell>
    <EntityListPage
      title="محصولات" entityLabel="محصول"
      breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "تجارت" }, { label: "محصولات" }]}
      source={products as any}
      columns={[
        { key: "title", label: "محصول", render: (r: any) => <div className="flex items-center gap-2"><img src={r.image} className="h-9 w-9 rounded-md object-cover" /><span className="line-clamp-1">{r.title}</span></div> },
        { key: "price", label: "قیمت", render: (r: any) => <Price value={r.price} /> },
        { key: "stock", label: "موجودی", render: (r: any) => <span className="fa-num">{r.stock}</span> },
        { key: "rating", label: "امتیاز", render: (r: any) => <Rating value={r.rating} /> },
        { key: "status", label: "وضعیت", render: (r: any) => <StatusBadge status={r.status} /> },
      ]}
      filters={[{ key: "status", label: "وضعیت", type: "status", options: [{ label: "فعال", value: "active" }, { label: "غیرفعال", value: "inactive" }, { label: "پیش‌نویس", value: "draft" }] }]}
      createLabel="افزودن محصول"
    />
  </Shell>
);

export const CategoriesAdminPage = () => (
  <Shell>
    <EntityListPage title="دسته‌بندی‌های محصول" entityLabel="دسته‌بندی" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "تجارت" }, { label: "دسته‌بندی‌ها" }]} source={categories} createLabel="افزودن دسته‌بندی" />
  </Shell>
);

export const OrdersAdminPage = () => (
  <Shell>
    <EntityListPage
      title="سفارش‌ها" entityLabel="سفارش"
      breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "تجارت" }, { label: "سفارش‌ها" }]}
      source={orders} createLabel="ثبت سفارش دستی"
      filters={[{ key: "status", label: "وضعیت", type: "status", options: [
        { label: "در انتظار", value: "pending" }, { label: "در حال پردازش", value: "processing" }, { label: "تأییدشده", value: "approved" }, { label: "ردشده", value: "rejected" },
      ] }]}
      onRowClick={() => {}}
    />
  </Shell>
);

export const OrderDetailPage = () => {
  const { id } = useParams();
  const order = orders.find((o) => o.id === id) ?? orders[0];
  return (
    <Shell>
      <PageHeader title={`جزئیات سفارش — ${order.title}`} breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "تجارت" }, { label: "سفارش‌ها", to: "/commerce/orders" }, { label: order.title }]}
        actions={<StatusBadge status={order.status} />}
      />
      <Card className="mb-4"><Stepper steps={["ثبت سفارش", "پردازش", "ارسال", "تحویل"]} current={2} /></Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-bold">اقلام سفارش</h3>
          {products.slice(0, 3).map((p) => (
            <div key={p.id} className="flex items-center gap-3 border-b border-border/70 py-2.5 last:border-0">
              <img src={p.image} className="h-10 w-10 rounded-md object-cover" />
              <span className="flex-1 text-sm">{p.title}</span>
              <Price value={p.price} />
            </div>
          ))}
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-bold">تاریخچه سفارش (Timeline)</h3>
          <Timeline items={[
            { title: "سفارش ثبت شد", time: formatDateTime(order.createdAt) },
            { title: "پرداخت تایید شد", time: formatDateTime(order.createdAt) },
            { title: "در حال آماده‌سازی", time: formatDateTime(order.createdAt) },
          ]} />
        </Card>
      </div>
    </Shell>
  );
};

export const SalesDashboardPage = () => (
  <Shell>
    <PageHeader title="داشبورد فروش" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "تجارت" }, { label: "فروش" }]} />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4">
      <KpiCard title="فروش این ماه" value={formatCurrency(4820000000)} delta="۱۸٪ رشد" deltaType="up" icon={<Icon name="money" size={18} />} accent="primary" sparkline={salesTrend.slice(-6)} />
      <KpiCard title="تعداد سفارش" value="۵۶۰" deltaType="neutral" icon={<Icon name="invoice" size={18} />} accent="info" />
      <KpiCard title="میانگین سبد خرید" value={formatCurrency(1250000)} deltaType="neutral" icon={<Icon name="cart" size={18} />} accent="success" />
      <KpiCard title="نرخ بازگشت" value="۲.۴٪" deltaType="down" icon={<Icon name="repeat" size={18} />} accent="warning" />
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <h3 className="mb-1 text-sm font-bold">روند فروش ۱۰ روز اخیر</h3>
        <TrendAreaChart data={salesTrend} />
      </Card>
      <Card>
        <h3 className="mb-1 text-sm font-bold">سهم فروش دسته‌بندی‌ها</h3>
        <DonutChart data={categoryDonut} height={168} />
      </Card>
    </div>
  </Shell>
);

export const PurchasesAdminPage = () => (
  <Shell>
    <EntityListPage title="سفارش‌های خرید" entityLabel="سفارش خرید" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "تجارت" }, { label: "خریدها" }]} source={purchases} createLabel="ثبت سفارش خرید" />
  </Shell>
);
