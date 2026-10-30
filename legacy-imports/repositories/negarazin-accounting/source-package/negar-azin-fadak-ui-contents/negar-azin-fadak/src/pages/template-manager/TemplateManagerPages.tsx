import React, { useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { adminNav } from "../../components/layout/nav.config";
import { PageHeader } from "../../components/patterns/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Field, Input, Select } from "../../components/ui/Form";
import { Tabs } from "../../components/ui/Nav";
import { useToast } from "../../components/ui/Toast";

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppShell nav={adminNav} portalLabel="مرکز مدیریت نگار آذین فدک">{children}</AppShell>
);

const templates = [
  { id: "TPL-1", title: "قالب پیش‌فرض سازمانی", active: true, color: "#2f63eb", updated: "۲ روز پیش" },
  { id: "TPL-2", title: "قالب زمردی فروشگاهی", active: false, color: "#17b26a", updated: "۱ هفته پیش" },
  { id: "TPL-3", title: "قالب بنفش خلاقانه", active: false, color: "#7c3aed", updated: "۳ هفته پیش" },
  { id: "TPL-4", title: "قالب تیره (Dark)", active: false, color: "#141b2d", updated: "۱ ماه پیش" },
];

export const TemplateListPage = () => {
  const { push } = useToast();
  return (
    <Shell>
      <PageHeader
        title="مدیریت قالب‌ها"
        description="ظاهر کلی سامانه شامل رنگ، تایپوگرافی، چیدمان و کامپوننت‌ها را از این بخش کنترل کنید."
        breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "مدیریت قالب‌ها" }]}
        actions={<Button icon="＋">ایجاد قالب جدید</Button>}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {templates.map((t) => (
          <Card key={t.id} className="flex flex-col gap-3">
            <div className="h-24 rounded-lg" style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}99)` }} />
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.active && <Badge color="success">فعال</Badge>}
            </div>
            <p className="text-xs text-text-muted">آخرین ویرایش: {t.updated}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1">پیش‌نمایش</Button>
              {!t.active && <Button size="sm" className="flex-1" onClick={() => push("success", `«${t.title}» به‌عنوان قالب فعال تنظیم شد.`)}>فعال‌سازی</Button>}
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
};

export const TemplateEditorPage = () => {
  const [tab, setTab] = useState("colors");
  const [primary, setPrimary] = useState("#2f63eb");
  const [radius, setRadius] = useState("10");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const frameWidth = device === "desktop" ? "100%" : device === "tablet" ? "540px" : "320px";

  return (
    <Shell>
      <PageHeader title="ویرایش قالب — قالب پیش‌فرض سازمانی" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "مدیریت قالب‌ها", to: "/template-manager" }, { label: "ویرایش" }]}
        actions={<Button variant="success">انتشار و فعال‌سازی</Button>}
      />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <Tabs tabs={[
            { key: "colors", label: "رنگ‌ها" }, { key: "typo", label: "تایپوگرافی" }, { key: "layout", label: "چیدمان" },
          ]} active={tab} onChange={setTab} />
          <div className="mt-4 flex flex-col gap-4">
            {tab === "colors" && (
              <>
                <Field label="رنگ اصلی (Primary)"><input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-10 w-full rounded-md border border-border" /></Field>
                <Field label="رنگ ثانویه (Secondary)"><input type="color" defaultValue="#7c3aed" className="h-10 w-full rounded-md border border-border" /></Field>
                <Field label="پس‌زمینه (Background)"><input type="color" defaultValue="#f4f6fb" className="h-10 w-full rounded-md border border-border" /></Field>
              </>
            )}
            {tab === "typo" && (
              <>
                <Field label="فونت پایه"><Select options={[{ label: "وزیرمتن (Vazirmatn)", value: "vazir" }, { label: "ایران‌سنس", value: "iransans" }]} /></Field>
                <Field label="اندازه پایه متن"><Select options={[{ label: "کوچک", value: "sm" }, { label: "متوسط", value: "md" }, { label: "بزرگ", value: "lg" }]} /></Field>
              </>
            )}
            {tab === "layout" && (
              <>
                <Field label="شعاع گردی اجزا (Radius)">
                  <input type="range" min={0} max={24} value={radius} onChange={(e) => setRadius(e.target.value)} className="w-full" />
                </Field>
                <Field label="عرض سایدبار"><Select options={[{ label: "استاندارد", value: "std" }, { label: "کم‌عرض", value: "narrow" }]} /></Field>
              </>
            )}
          </div>
        </Card>

        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-semibold">پیش‌نمایش زنده (Live Preview)</span>
            <div className="flex gap-1">
              {(["desktop", "tablet", "mobile"] as const).map((d) => (
                <button key={d} onClick={() => setDevice(d)} className={`rounded-md px-2 py-1 text-xs ${device === d ? "bg-primary-50 text-primary-700" : "text-text-muted"}`}>
                  {d === "desktop" ? "دسکتاپ" : d === "tablet" ? "تبلت" : "موبایل"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-center bg-bg p-6">
            <div style={{ width: frameWidth, borderRadius: `${radius}px` }} className="bg-surface border border-border p-4 transition-all">
              <div className="flex items-center gap-2 mb-4">
                <span style={{ background: primary, borderRadius: `${radius}px` }} className="h-8 w-8 grid place-items-center text-white text-xs">ن</span>
                <span className="text-sm font-bold">نگار آذین فدک</span>
              </div>
              <div style={{ background: primary, borderRadius: `${radius}px` }} className="h-9 w-32 mb-3 grid place-items-center text-white text-xs">دکمه نمونه</div>
              <div style={{ borderRadius: `${radius}px` }} className="border border-border p-3 text-xs text-text-muted">کارت نمونه برای پیش‌نمایش قالب</div>
            </div>
          </div>
        </Card>
      </div>
    </Shell>
  );
};

export const TemplateVersionsPage = () => (
  <Shell>
    <PageHeader title="تاریخچه نسخه‌های قالب" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "مدیریت قالب‌ها", to: "/template-manager" }, { label: "تاریخچه نسخه" }]} />
    <Card padded={false}>
      {["نسخه ۴ — فعال", "نسخه ۳", "نسخه ۲", "نسخه ۱ (نسخه اولیه)"].map((v, i) => (
        <div key={v} className="flex items-center justify-between border-b border-border/70 px-4 py-3 last:border-0">
          <span className="text-sm">{v}</span>
          {i !== 0 ? <Button size="sm" variant="outline">بازگردانی</Button> : <Badge color="success">در حال استفاده</Badge>}
        </div>
      ))}
    </Card>
  </Shell>
);
