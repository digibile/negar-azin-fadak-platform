import React, { useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { adminNav } from "../../components/layout/nav.config";
import { PageHeader } from "../../components/patterns/PageHeader";
import { KpiCard, Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/Table";
import { Badge, StatusBadge } from "../../components/ui/Badge";
import { Timeline, Avatar } from "../../components/ui/Misc";
import { Tabs } from "../../components/ui/Nav";
import { Field, Input, Switch, Select } from "../../components/ui/Form";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { TrendAreaChart, DonutChart } from "../../components/ui/Chart";
import { mockNotifications } from "../../mock/notifications";
import { formatCurrency, formatDateTime, relativeTime } from "../../lib/utils/format";
import { orders, customersData } from "../../mock/commerce";
import { creditRequests } from "../../mock/financial";
import { salesTrend, categoryDonut } from "../../mock/trend";
import { AVAILABLE_THEMES } from "../../theme/themes";
import { useTheme } from "../../theme/ThemeProvider";
import { useToast } from "../../components/ui/Toast";

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppShell nav={adminNav} portalLabel="مرکز مدیریت نگار آذین فدک">{children}</AppShell>
);

export const MasterDashboardPage = () => (
  <Shell>
    <PageHeader title="داشبورد مدیریت" breadcrumb={[{ label: "خانه" }, { label: "داشبورد" }]} description="نمای کلی از وضعیت کسب‌وکار نگار آذین فدک" />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-5">
      <KpiCard title="فروش امروز" value={formatCurrency(482000000)} delta="۱۲٪ نسبت به دیروز" deltaType="up" icon={<Icon name="money" size={18} />} accent="primary" sparkline={salesTrend.slice(-6)} />
      <KpiCard title="سفارش‌های در انتظار" value="۳۶" delta="۴ مورد جدید" deltaType="neutral" icon={<Icon name="invoice" size={18} />} accent="info" />
      <KpiCard title="مشتریان جدید" value="۱۲۸" delta="۸٪ رشد هفتگی" deltaType="up" icon={<Icon name="team" size={18} />} accent="success" />
      <KpiCard title="درخواست‌های اعتبار" value="۱۹" delta="۳ مورد پرریسک" deltaType="down" icon={<Icon name="card" size={18} />} accent="warning" />
    </div>
    <div className="grid gap-4 lg:grid-cols-3 mb-4">
      <Card className="lg:col-span-2">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-bold">روند فروش ۱۰ روز اخیر</h3>
          <Badge color="success">۱۸٪ رشد</Badge>
        </div>
        <TrendAreaChart data={salesTrend} />
      </Card>
      <Card>
        <h3 className="mb-1 text-sm font-bold">سهم فروش دسته‌بندی‌ها</h3>
        <DonutChart data={categoryDonut} height={168} />
      </Card>
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold">آخرین سفارش‌ها</h3>
          <Badge color="primary">{orders.length} سفارش</Badge>
        </div>
        <DataTable
          columns={[
            { key: "title", label: "سفارش" },
            { key: "subtitle", label: "مشتری" },
            { key: "status", label: "وضعیت", render: (r) => <StatusBadge status={r.status} /> },
            { key: "createdAt", label: "تاریخ", render: (r) => <span className="fa-num">{formatDateTime(r.createdAt)}</span> },
          ]}
          rows={orders.slice(0, 6)}
        />
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-bold">آخرین فعالیت‌ها</h3>
        <Timeline items={mockNotifications.slice(0, 5).map((n) => ({ title: n.title, time: relativeTime(n.createdAt) }))} />
      </Card>
    </div>
  </Shell>
);

export const NotificationsPage = () => (
  <Shell>
    <PageHeader title="اعلان‌ها" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "اعلان‌ها" }]} />
    <Card padded={false}>
      {mockNotifications.map((n) => (
        <div key={n.id} className="flex items-start gap-3 border-b border-border/70 px-4 py-3 last:border-0">
          <span className={`mt-1 h-2 w-2 rounded-full ${n.read ? "bg-border" : "bg-primary-500"}`} />
          <div className="flex-1">
            <p className={`text-sm ${n.read ? "text-text-muted" : "font-medium"}`}>{n.title}</p>
            <p className="text-xs text-text-muted">{relativeTime(n.createdAt)}</p>
          </div>
        </div>
      ))}
    </Card>
  </Shell>
);

export const ProfilePage = () => (
  <Shell>
    <PageHeader title="پروفایل من" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "پروفایل" }]} />
    <Card className="max-w-2xl">
      <div className="mb-5 flex items-center gap-3">
        <Avatar name="سارا محمدی" size={64} />
        <div>
          <p className="font-bold">سارا محمدی</p>
          <p className="text-sm text-text-muted">مدیر ارشد سیستم · مرکز مدیریت نگار آذین فدک</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="نام و نام خانوادگی"><Input defaultValue="سارا محمدی" /></Field>
        <Field label="شماره موبایل"><Input defaultValue="09121234567" dir="ltr" /></Field>
        <Field label="ایمیل"><Input defaultValue="sara.mohammadi@negarazin.ir" dir="ltr" /></Field>
        <Field label="نقش سازمانی"><Input defaultValue="مدیر ارشد سیستم" disabled /></Field>
      </div>
      <Button className="mt-5">ذخیره تغییرات</Button>
    </Card>
  </Shell>
);

export const AccountPage = () => {
  const [tab, setTab] = useState("info");
  return (
    <Shell>
      <PageHeader title="حساب کاربری" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "حساب کاربری" }]} />
      <Tabs tabs={[{ key: "info", label: "اطلاعات" }, { key: "security", label: "امنیت" }, { key: "sessions", label: "نشست‌ها" }]} active={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === "info" && <Card>اطلاعات کلی حساب کاربری در این بخش نمایش داده می‌شود.</Card>}
        {tab === "security" && (
          <Card className="max-w-md flex flex-col gap-4">
            <Switch checked label="فعال‌سازی احراز هویت دو مرحله‌ای" onChange={() => {}} />
            <Switch checked={false} label="ورود از دستگاه‌های ناشناس با تایید ایمیل" onChange={() => {}} />
          </Card>
        )}
        {tab === "sessions" && <Card>لیست نشست‌های فعال در بخش «تاریخچه ورود» قابل مشاهده است.</Card>}
      </div>
    </Shell>
  );
};

export const SettingsPage = () => {
  const { theme, setTheme, density, setDensity } = useTheme();
  const { push } = useToast();
  return (
    <Shell>
      <PageHeader title="تنظیمات" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "تنظیمات" }]} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-sm font-bold">ظاهر سیستم</h3>
          <Field label="قالب رنگی" hint="این تنظیم معادل پیش‌نمایش زنده «مدیریت قالب‌ها» است.">
            <Select value={theme} onChange={(e) => setTheme(e.target.value as any)} options={AVAILABLE_THEMES.map((t) => ({ label: t.label, value: t.id }))} />
          </Field>
          <Field label="تراکم نمایش اطلاعات" hint="برای صفحات مدیریتی با داده زیاد">
            <Select value={density} onChange={(e) => setDensity(e.target.value as any)} options={[{ label: "معمولی", value: "comfortable" }, { label: "فشرده", value: "compact" }]} />
          </Field>
        </Card>
        <Card>
          <h3 className="mb-4 text-sm font-bold">اعلان‌ها</h3>
          <div className="flex flex-col gap-3">
            <Switch checked label="اعلان سفارش‌های جدید" onChange={() => {}} />
            <Switch checked label="اعلان درخواست‌های اعتبار" onChange={() => {}} />
            <Switch checked={false} label="اعلان ایمیلی خلاصه روزانه" onChange={() => {}} />
          </div>
          <Button className="mt-4" size="sm" onClick={() => push("success", "تنظیمات ذخیره شد.")}>ذخیره تنظیمات</Button>
        </Card>
      </div>
    </Shell>
  );
};
