import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Form";
import { Stepper } from "../../components/ui/Misc";
import { DataTable } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { useToast } from "../../components/ui/Toast";
import { formatDateTime } from "../../lib/utils/format";
import { generateEntities } from "../../mock/generate";

const AuthShell: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }> = ({ title, subtitle, children, footer }) => (
  <div className="min-h-screen flex items-center justify-center bg-bg p-4" dir="rtl">
    <Card className="w-full max-w-md">
      <div className="mb-6 flex flex-col items-center text-center gap-2">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-500 text-white text-xl font-bold">ن</span>
        <h1 className="text-lg font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
      </div>
      {children}
      {footer && <div className="mt-5 text-center text-xs text-text-muted">{footer}</div>}
    </Card>
  </div>
);

export const LoginPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"password" | "otp">("password");
  return (
    <AuthShell title="ورود به مرکز مدیریت نگار آذین فدک" subtitle="پلتفرم بیزینس نگار آذین فدک ایران">
      <div className="mb-4 flex rounded-md bg-bg p-1 text-sm">
        <button onClick={() => setMode("password")} className={`flex-1 rounded-md py-2 ${mode === "password" ? "bg-surface shadow-card font-semibold" : "text-text-muted"}`}>ورود با رمز عبور</button>
        <button onClick={() => setMode("otp")} className={`flex-1 rounded-md py-2 ${mode === "otp" ? "bg-surface shadow-card font-semibold" : "text-text-muted"}`}>ورود با کد یکبار مصرف</button>
      </div>
      <div className="flex flex-col gap-4">
        <Field label="شماره موبایل یا نام کاربری" required><Input placeholder="09xxxxxxxxx" /></Field>
        {mode === "password" && (
          <Field label="رمز عبور" required>
            <Input type="password" placeholder="••••••••" />
          </Field>
        )}
        {mode === "password" && <Link to="/auth/forgot-password" className="-mt-2 text-xs text-primary-600">رمز عبور را فراموش کرده‌اید؟</Link>}
        <Button fullWidth size="lg" onClick={() => navigate(mode === "otp" ? "/auth/verify-otp" : "/auth/portal-selection")}>
          {mode === "otp" ? "ارسال کد تایید" : "ورود"}
        </Button>
      </div>
      <div className="mt-5 text-center text-xs text-text-muted">
        نیاز به احراز هویت بیشتر دارید؟ <Link to="/auth/mfa" className="text-primary-600">تنظیم MFA</Link>
      </div>
    </AuthShell>
  );
};

export const MobileLoginPage = () => (
  <AuthShell title="ورود با موبایل">
    <Field label="شماره موبایل" required><Input placeholder="09xxxxxxxxx" /></Field>
    <Button fullWidth size="lg" className="mt-4"><Link to="/auth/verify-otp">دریافت کد تایید</Link></Button>
  </AuthShell>
);

export const OtpPage = () => {
  const navigate = useNavigate();
  return (
    <AuthShell title="کد تایید ارسال شد" subtitle="کد ۵ رقمی ارسال‌شده به شماره شما را وارد کنید">
      <div className="mb-4 flex justify-center gap-2" dir="ltr">
        {Array.from({ length: 5 }).map((_, i) => <Input key={i} maxLength={1} className="h-12 w-12 text-center text-lg" />)}
      </div>
      <Button fullWidth size="lg" onClick={() => navigate("/auth/portal-selection")}>تایید و ورود</Button>
      <p className="mt-3 text-center text-xs text-text-muted">ارسال دوباره کد تا ۰۰:۵۹</p>
    </AuthShell>
  );
};
export const VerifyOtpPage = OtpPage;

export const ForgotPasswordPage = () => (
  <AuthShell title="بازیابی رمز عبور" subtitle="شماره موبایل ثبت‌شده خود را وارد کنید">
    <Field label="شماره موبایل" required><Input placeholder="09xxxxxxxxx" /></Field>
    <Button fullWidth size="lg" className="mt-4"><Link to="/auth/reset-password">ارسال لینک بازیابی</Link></Button>
  </AuthShell>
);

export const ResetPasswordPage = () => {
  const { push } = useToast();
  return (
    <AuthShell title="تعیین رمز عبور جدید">
      <div className="flex flex-col gap-4">
        <Field label="رمز عبور جدید" required><Input type="password" /></Field>
        <Field label="تکرار رمز عبور" required><Input type="password" /></Field>
        <Button fullWidth size="lg" onClick={() => push("success", "رمز عبور با موفقیت تغییر یافت.")}>ثبت رمز عبور جدید</Button>
      </div>
    </AuthShell>
  );
};

export const ChangePasswordPage = () => (
  <Card className="max-w-md">
    <h2 className="mb-4 text-base font-bold">تغییر رمز عبور</h2>
    <div className="flex flex-col gap-4">
      <Field label="رمز عبور فعلی" required><Input type="password" /></Field>
      <Field label="رمز عبور جدید" required><Input type="password" /></Field>
      <Field label="تکرار رمز عبور جدید" required><Input type="password" /></Field>
      <Button className="w-fit">ذخیره تغییرات</Button>
    </div>
  </Card>
);

export const MfaPage = () => (
  <AuthShell title="تنظیم احراز هویت دو مرحله‌ای" subtitle="یکی از روش‌های زیر را انتخاب کنید">
    <div className="flex flex-col gap-3">
      {["اپلیکیشن احراز هویت (Google Authenticator)", "کد پیامکی", "ایمیل امنیتی"].map((m) => (
        <button key={m} className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm hover:border-primary-400">
          {m} <span>›</span>
        </button>
      ))}
    </div>
  </AuthShell>
);

export const SecurityVerificationPage = () => (
  <AuthShell title="تایید امنیتی" subtitle="فعالیت شما نیازمند تایید هویت مجدد است">
    <Stepper steps={["درخواست", "تایید هویت", "دسترسی"]} current={1} />
    <Field label="کد تایید ارسال‌شده" required><Input className="mt-4" /></Field>
    <Button fullWidth size="lg" className="mt-4">تایید</Button>
  </AuthShell>
);

const sessions = generateEntities("SESS", 5, (i) => `نشست فعال ${i}`, () => "مرورگر Chrome — ویندوز");

export const SessionManagementPage = () => (
  <Card>
    <h2 className="mb-4 text-base font-bold">مدیریت نشست‌های فعال</h2>
    <DataTable
      columns={[
        { key: "title", label: "دستگاه" },
        { key: "subtitle", label: "جزئیات" },
        { key: "createdAt", label: "آخرین فعالیت", render: (r) => formatDateTime(r.createdAt) },
        { key: "status", label: "وضعیت", render: () => <Badge color="success">فعال</Badge> },
      ]}
      rows={sessions}
      rowActions={() => <button className="text-xs text-danger-600">پایان نشست</button>}
    />
  </Card>
);

const loginHistory = generateEntities("LH", 8, (i) => `ورود موفق شماره ${i}`, () => "IP: 192.168.1.x");

export const LoginHistoryPage = () => (
  <Card>
    <h2 className="mb-4 text-base font-bold">تاریخچه ورود</h2>
    <DataTable
      columns={[
        { key: "title", label: "رویداد" },
        { key: "subtitle", label: "آدرس IP" },
        { key: "createdAt", label: "زمان", render: (r) => formatDateTime(r.createdAt) },
      ]}
      rows={loginHistory}
    />
  </Card>
);

export const LogoutPage = () => {
  const navigate = useNavigate();
  return (
    <AuthShell title="خروج از حساب کاربری" subtitle="آیا مطمئن هستید؟">
      <div className="flex gap-2">
        <Button fullWidth variant="outline" onClick={() => navigate(-1)}>انصراف</Button>
        <Button fullWidth variant="danger" onClick={() => navigate("/auth/login")}>خروج</Button>
      </div>
    </AuthShell>
  );
};

const PORTALS = [
  { key: "super-admin", label: "پرتال مدیریت ارشد", icon: "🛡️", to: "/master/dashboard" },
  { key: "finance", label: "پرتال مالی", icon: "💰", to: "/portals/finance" },
  { key: "credit", label: "پرتال اعتبار", icon: "💳", to: "/portals/credit" },
  { key: "commerce", label: "پرتال تجارت", icon: "🛍️", to: "/portals/commerce" },
  { key: "merchant", label: "پرتال پذیرندگان", icon: "🏪", to: "/portals/merchant" },
  { key: "store", label: "پرتال فروشگاه", icon: "🏬", to: "/portals/store" },
  { key: "accounting", label: "پرتال حسابداری", icon: "📑", to: "/portals/accounting" },
  { key: "customer", label: "پرتال مشتریان", icon: "🧑‍🤝‍🧑", to: "/shop/home" },
];

export const PortalSelectionPage = () => (
  <div className="min-h-screen bg-bg p-6" dir="rtl">
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-xl font-bold">انتخاب پرتال</h1>
      <p className="mb-6 text-sm text-text-muted">به مرکز مدیریت نگار آذین فدک خوش آمدید. لطفاً پرتال مورد نظر خود را انتخاب کنید.</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {PORTALS.map((p) => (
          <Link key={p.key} to={p.to}>
            <Card className="flex flex-col items-center gap-2 text-center hover:border-primary-400 hover:shadow-pop transition-all">
              <span className="text-3xl">{p.icon}</span>
              <span className="text-sm font-medium">{p.label}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  </div>
);
