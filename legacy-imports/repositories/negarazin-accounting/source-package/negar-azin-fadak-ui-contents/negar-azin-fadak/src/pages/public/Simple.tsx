import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PublicLayout } from "../../components/patterns/PublicLayout";
import { Card } from "../../components/ui/Card";
import { Price, Rating } from "../../components/ui/Misc";
import { Button } from "../../components/ui/Button";
import { Accordion } from "../../components/ui/Nav";
import { Input, Textarea, Field } from "../../components/ui/Form";
import { products, categories } from "../../mock/commerce";
import { brands, stores } from "../../mock/organization";
import { EmptyState } from "../../components/ui/States";
import { useToast } from "../../components/ui/Toast";

export const AboutPage = () => (
  <PublicLayout>
    <Card className="max-w-3xl mx-auto text-sm leading-7 text-text-muted">
      <h1 className="mb-3 text-xl font-bold text-text">درباره پلتفرم بیزینس نگار آذین فدک</h1>
      <p>پلتفرم بیزینس نگار آذین فدک ایران، سامانه یکپارچه مدیریت کسب‌وکار است که تجارت، اعتبار، تسهیلات، مالی و ارتباط با مشتری را در یک محیط واحد گرد هم می‌آورد. این نسخه صرفاً برای پیش‌نمایش تجربه کاربری (UI/UX) طراحی شده است.</p>
    </Card>
  </PublicLayout>
);

export const BrandsPage = () => (
  <PublicLayout>
    <h1 className="mb-4 text-xl font-bold">برندها</h1>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {brands.map((b) => (
        <Card key={b.id} className="text-center">
          <div className="mx-auto mb-2 h-14 w-14 rounded-full bg-primary-50 grid place-items-center text-primary-600 font-bold">{b.title[0]}</div>
          <p className="text-sm font-medium">{b.title}</p>
        </Card>
      ))}
    </div>
  </PublicLayout>
);

export const StoresPage = () => (
  <PublicLayout>
    <h1 className="mb-4 text-xl font-bold">فروشگاه‌ها</h1>
    <div className="grid gap-3 md:grid-cols-3">
      {stores.map((s) => (
        <Card key={s.id}>
          <p className="font-semibold text-sm">{s.title}</p>
          <p className="mt-1 text-xs text-text-muted">{s.subtitle}</p>
        </Card>
      ))}
    </div>
  </PublicLayout>
);

export const CategoriesPage = () => (
  <PublicLayout>
    <h1 className="mb-4 text-xl font-bold">دسته‌بندی‌ها</h1>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {categories.map((c) => (
        <Link key={c.id} to="/products"><Card className="text-center text-sm hover:border-primary-300">{c.title}</Card></Link>
      ))}
    </div>
  </PublicLayout>
);

export const ProductsPage = () => {
  const [q, setQ] = useState("");
  const filtered = products.filter((p) => p.title.includes(q));
  return (
    <PublicLayout>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">محصولات</h1>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی محصول..." className="max-w-xs" />
      </div>
      {filtered.length === 0 ? <EmptyState title="محصولی یافت نشد" /> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((p) => (
            <Link key={p.id} to={`/products/${p.id}`}>
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
      )}
    </PublicLayout>
  );
};

export const ProductDetailPage = () => {
  const { id } = useParams();
  const product = products.find((p) => p.id === id) ?? products[0];
  return (
    <PublicLayout>
      <div className="grid gap-6 md:grid-cols-2">
        <img src={product.image} className="rounded-xl w-full aspect-square object-cover" />
        <div>
          <h1 className="text-xl font-bold">{product.title}</h1>
          <div className="mt-2"><Rating value={product.rating} count={128} /></div>
          <div className="mt-4"><Price value={product.price} oldValue={product.price + 300000} /></div>
          <p className="mt-4 text-sm text-text-muted leading-7">این محصول نمونه، صرفاً برای نمایش UI صفحه محصول در پلتفرم بیزینس نگار آذین فدک است و مشخصات فنی واقعی ندارد.</p>
          <div className="mt-5 flex gap-2">
            <Button size="lg">افزودن به سبد خرید</Button>
            <Button size="lg" variant="outline">❤ افزودن به علاقه‌مندی‌ها</Button>
          </div>
          <div className="mt-6">
            <Accordion items={[
              { title: "مشخصات فنی", content: "مشخصات نمایشی محصول در این بخش قرار می‌گیرد." },
              { title: "نظرات کاربران", content: "هنوز نظری ثبت نشده است." },
              { title: "ارسال و مرجوعی", content: "شرایط ارسال و مرجوعی نمایشی است." },
            ]} />
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export const FaqPage = () => (
  <PublicLayout>
    <h1 className="mb-4 text-xl font-bold">سوالات متداول</h1>
    <Accordion items={Array.from({ length: 5 }).map((_, i) => ({
      title: `سوال متداول شماره ${i + 1} در مورد پلتفرم؟`,
      content: "این پاسخ نمایشی است و صرفاً برای پیش‌نمایش UI صفحه سوالات متداول ارائه شده است.",
    }))} />
  </PublicLayout>
);

export const ContactPage = () => {
  const { push } = useToast();
  return (
    <PublicLayout>
      <Card className="max-w-lg mx-auto">
        <h1 className="mb-4 text-xl font-bold">تماس با ما</h1>
        <div className="flex flex-col gap-4">
          <Field label="نام و نام خانوادگی"><Input /></Field>
          <Field label="پیام"><Textarea /></Field>
          <Button onClick={() => push("success", "پیام شما با موفقیت ارسال شد (نمایشی).")}>ارسال پیام</Button>
        </div>
      </Card>
    </PublicLayout>
  );
};

export const TermsPage = () => (
  <PublicLayout>
    <Card className="max-w-3xl mx-auto text-sm leading-7 text-text-muted">
      <h1 className="mb-3 text-xl font-bold text-text">قوانین و مقررات</h1>
      <p>استفاده از پلتفرم بیزینس نگار آذین فدک به معنای پذیرش قوانین و مقررات نمایشی این نسخه پیش‌نمایش است.</p>
    </Card>
  </PublicLayout>
);

export const SearchPage = () => {
  const [q, setQ] = useState("");
  const results = products.filter((p) => p.title.includes(q));
  return (
    <PublicLayout>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="عبارت جستجو..." className="max-w-md mb-4" />
      {q && results.length === 0 ? <EmptyState title="نتیجه‌ای یافت نشد" /> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {results.map((p) => (
            <Link key={p.id} to={`/products/${p.id}`}><Card><p className="text-xs">{p.title}</p><Price value={p.price} /></Card></Link>
          ))}
        </div>
      )}
    </PublicLayout>
  );
};
