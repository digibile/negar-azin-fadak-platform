import React, { useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { adminNav } from "../../components/layout/nav.config";
import { PageHeader } from "../../components/patterns/PageHeader";
import { Card } from "../../components/ui/Card";
import { Tabs } from "../../components/ui/Nav";
import { Field, Input, Switch, Select } from "../../components/ui/Form";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";

const TABS = [
  { key: "org", label: "سازمان" }, { key: "domain", label: "دامنه" }, { key: "email", label: "ایمیل" }, { key: "sms", label: "پیامک" },
  { key: "notif", label: "اعلان" }, { key: "security", label: "امنیت" }, { key: "login", label: "ورود" }, { key: "mfa", label: "MFA" }, { key: "session", label: "نشست" },
];

export default function SettingsCenterPage() {
  const [tab, setTab] = useState("org");
  const { push } = useToast();
  return (
    <AppShell nav={adminNav} portalLabel="مرکز مدیریت نگار آذین فدک">
      <PageHeader title="تنظیمات سازمانی" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "تنظیمات" }]} />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <Card className="mt-4 max-w-2xl">
        {tab === "org" && (
          <div className="flex flex-col gap-4">
            <Field label="نام رسمی سازمان"><Input defaultValue="پلتفرم بیزینس نگار آذین فدک ایران" /></Field>
            <Field label="نام کوتاه"><Input defaultValue="پلتفرم بیزینس نگار آذین فدک" /></Field>
            <Field label="شناسه ملی"><Input dir="ltr" /></Field>
          </div>
        )}
        {tab === "domain" && <Field label="دامنه اصلی"><Input dir="ltr" defaultValue="app.negarazinfadak.ir" /></Field>}
        {tab === "email" && <div className="flex flex-col gap-4"><Field label="سرور SMTP"><Input dir="ltr" /></Field><Field label="ایمیل ارسال‌کننده"><Input dir="ltr" /></Field></div>}
        {tab === "sms" && <div className="flex flex-col gap-4"><Field label="سامانه ارسال پیامک"><Select options={[{ label: "کاوه‌نگار", value: "kavenegar" }, { label: "ملی‌پیامک", value: "melipayamak" }]} /></Field></div>}
        {tab === "notif" && <div className="flex flex-col gap-3"><Switch checked label="اعلان درون‌سیستمی" onChange={() => {}} /><Switch checked label="اعلان پیامکی" onChange={() => {}} /><Switch checked={false} label="اعلان ایمیلی" onChange={() => {}} /></div>}
        {tab === "security" && <div className="flex flex-col gap-3"><Switch checked label="قفل حساب پس از ۵ تلاش ناموفق" onChange={() => {}} /><Switch checked label="الزام رمز عبور پیچیده" onChange={() => {}} /></div>}
        {tab === "login" && <div className="flex flex-col gap-4"><Field label="حداکثر مدت نشست (دقیقه)"><Input defaultValue="60" dir="ltr" /></Field></div>}
        {tab === "mfa" && <Switch checked label="الزام MFA برای مدیران سیستم" onChange={() => {}} />}
        {tab === "session" && <Field label="مدت انقضای Token (ساعت)"><Input defaultValue="24" dir="ltr" /></Field>}
        <Button className="mt-5" onClick={() => push("success", "تنظیمات ذخیره شد.")}>ذخیره تغییرات</Button>
      </Card>
    </AppShell>
  );
}
