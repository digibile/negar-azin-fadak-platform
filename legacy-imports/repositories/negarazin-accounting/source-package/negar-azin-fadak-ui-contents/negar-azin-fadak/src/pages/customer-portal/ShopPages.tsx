import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CustomerShell } from "../../components/layout/CustomerShell";
import { Card, KpiCard } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Price, Rating, Stepper, Avatar } from "../../components/ui/Misc";
import { StatusBadge, Badge } from "../../components/ui/Badge";
import { Field, Input, Textarea } from "../../components/ui/Form";
import { Tabs } from "../../components/ui/Nav";
import { products, orders } from "../../mock/commerce";
import { formatCurrency, formatDate } from "../../lib/utils/format";
import { EmptyState } from "../../components/ui/States";
import { useToast } from "../../components/ui/Toast";

export const ShopHomePage = () => (
  <CustomerShell>
    <div className="mb-5 rounded-2xl bg-gradient-to-l from-primary-600 to-primary-500 p-6 text-white">
      <p className="text-sm opacity-80">خوش آمدید،</p>
      <h1 className="text-xl font-bold">مشتری نمونه 👋</h1>
      <p className="mt-2 text-sm opacity-90">سقف اعتبار فعال شما: <span className="fa-num font-bold">{formatCurrency(15000000)}</span></p>
    </div>
    <h2 className="mb-3 text-base font-bold">پیشنهاد ویژه برای شما</h2>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {products.slice(0, 8).map((p) => (
        <Link key={p.id} to={`/shop/products/${p.id}`}>
          <Card padded={false} className="overflow-hidden h-full flex flex-col hover-lift">
            <img src={p.image} className="aspect-square w-full object-cover" />
            <div className="p-3 flex-1 flex flex-col gap-2">
              <p className="text-xs line-clamp-2 min-h-[2.2rem]">{p.title}</p>
              <Rating value={p.rating} />
              <Price value={p.price} />
            </div>
          </Card>
        </Link>
      ))}
    </div>
  </CustomerShell>
);

export const ShopProfilePage = () => (
  <CustomerShell>
    <Card className="max-w-lg">
      <div className="mb-4 flex items-center gap-3"><Avatar name="مشتری نمونه" size={56} /><div><p className="font-bold">مشتری نمونه</p><p className="text-xs text-text-muted" dir="ltr">0912xxxxxxx</p></div></div>
      <div className="grid gap-4">
        <Field label="نام و نام خانوادگی"><Input defaultValue="مشتری نمونه" /></Field>
        <Field label="آدرس"><Textarea /></Field>
      </div>
      <Button className="mt-4">ذخیره تغییرات</Button>
    </Card>
  </CustomerShell>
);

export const ShopOrdersPage = () => (
  <CustomerShell>
    <h1 className="mb-4 text-lg font-bold">سفارش‌های من</h1>
    <div className="flex flex-col gap-3">
      {orders.slice(0, 6).map((o) => (
        <Link key={o.id} to={`/shop/orders/${o.id}`}>
          <Card className="flex items-center justify-between">
            <div><p className="text-sm font-medium">{o.title}</p><p className="text-xs text-text-muted fa-num">{formatDate(o.createdAt)}</p></div>
            <StatusBadge status={o.status} />
          </Card>
        </Link>
      ))}
    </div>
  </CustomerShell>
);

export const ShopOrderDetailPage = () => {
  const { id } = useParams();
  const order = orders.find((o) => o.id === id) ?? orders[0];
  return (
    <CustomerShell>
      <h1 className="mb-4 text-lg font-bold">{order.title}</h1>
      <Card className="mb-4"><Stepper steps={["ثبت سفارش", "پردازش", "ارسال", "تحویل"]} current={2} /></Card>
      <Card>{products.slice(0, 2).map((p) => (
        <div key={p.id} className="flex items-center gap-3 border-b border-border/70 py-2.5 last:border-0">
          <img src={p.image} className="h-10 w-10 rounded-md object-cover" /><span className="flex-1 text-sm">{p.title}</span><Price value={p.price} />
        </div>
      ))}</Card>
    </CustomerShell>
  );
};

export const ShopProductDetailPage = () => {
  const { id } = useParams();
  const product = products.find((p) => p.id === id) ?? products[0];
  const { push } = useToast();
  return (
    <CustomerShell>
      <div className="grid gap-6 md:grid-cols-2">
        <img src={product.image} className="rounded-xl w-full aspect-square object-cover" />
        <div>
          <h1 className="text-lg font-bold">{product.title}</h1>
          <div className="mt-2"><Rating value={product.rating} count={64} /></div>
          <div className="mt-3"><Price value={product.price} /></div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => push("success", "محصول به سبد خرید اضافه شد.")}>افزودن به سبد خرید</Button>
            <Button variant="outline">خرید اعتباری</Button>
          </div>
        </div>
      </div>
    </CustomerShell>
  );
};

export const ShopCartPage = () => {
  const [items] = useState(products.slice(0, 3));
  return (
    <CustomerShell>
      <h1 className="mb-4 text-lg font-bold">سبد خرید</h1>
      {items.length === 0 ? <EmptyState title="سبد خرید خالی است" /> : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2" padded={false}>
            {items.map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-b border-border/70 p-3 last:border-0">
                <img src={p.image} className="h-14 w-14 rounded-md object-cover" />
                <span className="flex-1 text-sm">{p.title}</span>
                <Price value={p.price} />
              </div>
            ))}
          </Card>
          <Card>
            <div className="flex justify-between text-sm mb-2"><span>جمع کل</span><Price value={items.reduce((s, p) => s + p.price, 0)} /></div>
            <Link to="/shop/checkout"><Button fullWidth className="mt-3">ادامه فرآیند خرید</Button></Link>
          </Card>
        </div>
      )}
    </CustomerShell>
  );
};

export const ShopCheckoutPage = () => (
  <CustomerShell>
    <h1 className="mb-4 text-lg font-bold">تکمیل خرید</h1>
    <Card className="mb-4"><Stepper steps={["سبد خرید", "آدرس", "پرداخت", "تایید نهایی"]} current={1} /></Card>
    <Card className="max-w-lg">
      <Field label="آدرس تحویل"><Textarea placeholder="آدرس کامل را وارد کنید" /></Field>
      <Link to="/shop/payment"><Button className="mt-4">ادامه به پرداخت</Button></Link>
    </Card>
  </CustomerShell>
);

export const ShopPaymentPage = () => {
  const [method, setMethod] = useState("wallet");
  return (
    <CustomerShell>
      <h1 className="mb-4 text-lg font-bold">پرداخت</h1>
      <div className="grid gap-3 max-w-lg">
        {[{ key: "wallet", label: "کیف پول (موجودی کافی)" }, { key: "credit", label: "خرید اعتباری (اقساطی)" }, { key: "gateway", label: "درگاه بانکی" }].map((m) => (
          <button key={m.key} onClick={() => setMethod(m.key)} className={`rounded-md border p-4 text-right text-sm ${method === m.key ? "border-primary-500 bg-primary-50" : "border-border"}`}>{m.label}</button>
        ))}
        <Button size="lg">پرداخت نهایی</Button>
      </div>
    </CustomerShell>
  );
};

export const ShopCreditPage = () => (
  <CustomerShell>
    <h1 className="mb-4 text-lg font-bold">اعتبار من</h1>
    <div className="grid grid-cols-2 gap-3 mb-4">
      <KpiCard title="سقف اعتبار" value={formatCurrency(15000000)} />
      <KpiCard title="اعتبار باقی‌مانده" value={formatCurrency(9500000)} />
    </div>
    <Link to="/shop/credit/apply"><Button>درخواست افزایش اعتبار</Button></Link>
  </CustomerShell>
);

export const ShopCreditApplyPage = () => {
  const { push } = useToast();
  return (
    <CustomerShell>
      <h1 className="mb-4 text-lg font-bold">درخواست اعتبار جدید</h1>
      <Card className="max-w-lg">
        <Field label="مبلغ درخواستی (تومان)"><Input dir="ltr" placeholder="۲۰,۰۰۰,۰۰۰" /></Field>
        <Field label="توضیحات" ><Textarea className="mt-4" /></Field>
        <Button className="mt-4" onClick={() => push("success", "درخواست اعتبار شما ثبت شد و در انتظار بررسی است.")}>ثبت درخواست</Button>
      </Card>
    </CustomerShell>
  );
};

export const ShopInstallmentsPage = () => (
  <CustomerShell>
    <h1 className="mb-4 text-lg font-bold">اقساط من</h1>
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="flex items-center justify-between">
          <div><p className="text-sm font-medium">قسط شماره {i + 1}</p><p className="text-xs text-text-muted fa-num">سررسید: ۱۴۰۴/۰{i + 5}/۱۵</p></div>
          <Badge color={i === 0 ? "warning" : "muted"}>{i === 0 ? "نزدیک سررسید" : "آینده"}</Badge>
        </Card>
      ))}
    </div>
  </CustomerShell>
);

export const ShopWalletPage = () => (
  <CustomerShell>
    <h1 className="mb-4 text-lg font-bold">کیف پول</h1>
    <Card className="mb-4 bg-gradient-to-l from-primary-600 to-primary-500 text-white">
      <p className="text-xs opacity-80">موجودی فعلی</p>
      <p className="text-2xl font-bold fa-num mt-1">{formatCurrency(2450000)}</p>
    </Card>
    <div className="flex gap-2 mb-4"><Button>افزایش موجودی</Button><Button variant="outline">برداشت</Button></div>
  </CustomerShell>
);

export const ShopNotificationsPage = () => (
  <CustomerShell>
    <h1 className="mb-4 text-lg font-bold">اعلان‌ها</h1>
    <Card>اعلان‌های مربوط به سفارش، اعتبار و اقساط در این بخش نمایش داده می‌شود.</Card>
  </CustomerShell>
);

export const ShopSupportPage = () => {
  const { push } = useToast();
  return (
    <CustomerShell>
      <h1 className="mb-4 text-lg font-bold">پشتیبانی</h1>
      <Card className="max-w-lg">
        <Field label="موضوع"><Input /></Field>
        <Field label="پیام"><Textarea className="mt-4" /></Field>
        <Button className="mt-4" onClick={() => push("success", "تیکت پشتیبانی شما ثبت شد.")}>ارسال تیکت</Button>
      </Card>
    </CustomerShell>
  );
};
