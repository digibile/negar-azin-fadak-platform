import React from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "../../components/patterns/PublicLayout";
import { Card } from "../../components/ui/Card";
import { Price, Rating } from "../../components/ui/Misc";
import { Button } from "../../components/ui/Button";
import { products, categories } from "../../mock/commerce";

export default function Home() {
  return (
    <PublicLayout>
      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 rounded-2xl bg-gradient-to-l from-primary-600 to-primary-500 p-8 text-white flex flex-col justify-center gap-3">
          <span className="text-xs bg-white/20 rounded-full px-3 py-1 w-fit">پلتفرم بیزینس نگار آذین فدک</span>
          <h1 className="text-2xl md:text-3xl font-bold leading-relaxed">سامانه یکپارچه مدیریت کسب‌وکار نگار آذین فدک</h1>
          <p className="text-sm text-white/80 max-w-md">تجربه خرید یکپارچه، مدیریت سازمانی حرفه‌ای و ابزارهای مالی و اعتباری، همه در یک پلتفرم.</p>
          <div className="flex gap-2 mt-2">
            <Link to="/products"><Button variant="secondary">مشاهده محصولات</Button></Link>
            <Link to="/auth/login"><Button variant="outline" className="!bg-white/10 !text-white !border-white/30">ورود به مرکز مدیریت</Button></Link>
          </div>
        </div>
        <Card className="flex flex-col gap-3 justify-center">
          <h3 className="font-bold text-sm">دسته‌بندی‌های پرطرفدار</h3>
          {categories.slice(0, 4).map((c) => (
            <Link key={c.id} to="/categories" className="flex items-center justify-between text-sm text-text-muted hover:text-primary-600">
              {c.title} <span>‹</span>
            </Link>
          ))}
        </Card>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">پیشنهاد ویژه امروز</h2>
          <Link to="/products" className="text-sm text-primary-600">مشاهده همه ‹</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {products.slice(0, 12).map((p) => (
            <Link key={p.id} to={`/products/${p.id}`}>
              <Card padded={false} className="overflow-hidden group h-full flex flex-col hover-lift">
                <img src={p.image} alt={p.title} className="aspect-square w-full object-cover group-hover:scale-105 transition-transform" />
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <p className="text-xs line-clamp-2 min-h-[2.2rem]">{p.title}</p>
                  <Rating value={p.rating} />
                  <Price value={p.price} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold">برندهای منتخب</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="surface-card grid h-20 w-32 shrink-0 place-items-center text-xs text-text-muted">برند {i + 1}</div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
