import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "../ui/Form";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

const megaCategories = ["دیجیتال", "خانه و آشپزخانه", "مد و پوشاک", "لوازم جانبی", "زیبایی و سلامت", "ابزار و صنعتی"];

export const PublicHeader: React.FC = () => {
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <button className="grid h-9 w-9 place-items-center rounded-md text-text-muted md:hidden" onClick={() => setMobileOpen((v) => !v)}>
          <Icon name="menu" size={20} />
        </button>
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white">ن</span>
          <span className="hidden sm:block text-sm font-bold">نگار آذین فدک</span>
        </Link>

        <div className="relative hidden md:block" onMouseEnter={() => setMegaOpen(true)} onMouseLeave={() => setMegaOpen(false)}>
          <button className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium hover:bg-bg">
            <Icon name="grid" size={16} /> دسته‌بندی‌ها <Icon name="chevronDown" size={13} />
          </button>
          {megaOpen && (
            <div className="absolute right-0 top-full z-50 grid w-[560px] grid-cols-2 gap-2 surface-card shadow-pop p-4">
              {megaCategories.map((c) => (
                <Link key={c} to="/categories" className="rounded-md px-3 py-2.5 text-sm hover:bg-bg">{c}</Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 flex relative">
          <Icon name="search" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input placeholder="جستجوی محصول، برند یا فروشگاه..." className="pr-9" />
        </div>

        <nav className="hidden lg:flex items-center gap-1 text-sm">
          <Link to="/stores" className="rounded-md px-3 py-2 hover:bg-bg">فروشگاه‌ها</Link>
          <Link to="/brands" className="rounded-md px-3 py-2 hover:bg-bg">برندها</Link>
          <Link to="/about" className="rounded-md px-3 py-2 hover:bg-bg">درباره ما</Link>
        </nav>

        <Link to="/shop/cart" className="grid h-9 w-9 place-items-center rounded-md text-text-muted hover:bg-bg"><Icon name="cart" size={19} /></Link>
        <Link to="/auth/login"><Button size="sm" variant="outline">ورود / ثبت‌نام</Button></Link>
      </div>

      {mobileOpen && (
        <div className="border-t border-border p-3 md:hidden space-y-1">
          <Link to="/categories" className="block rounded-md px-3 py-2 text-sm hover:bg-bg">دسته‌بندی‌ها</Link>
          <Link to="/stores" className="block rounded-md px-3 py-2 text-sm hover:bg-bg">فروشگاه‌ها</Link>
          <Link to="/brands" className="block rounded-md px-3 py-2 text-sm hover:bg-bg">برندها</Link>
          <Link to="/about" className="block rounded-md px-3 py-2 text-sm hover:bg-bg">درباره ما</Link>
        </div>
      )}
    </header>
  );
};
