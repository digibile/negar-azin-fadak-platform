import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Avatar } from "../ui/Misc";
import { Icon, type IconName } from "../ui/Icon";

const NAV: { to: string; icon: IconName; label: string }[] = [
  { to: "/shop/home", icon: "home", label: "خانه" },
  { to: "/shop/orders", icon: "invoice", label: "سفارش‌ها" },
  { to: "/shop/cart", icon: "cart", label: "سبد خرید" },
  { to: "/shop/wallet", icon: "wallet2", label: "کیف پول" },
  { to: "/shop/profile", icon: "user-round", label: "پروفایل" },
];

export const CustomerShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-bg pb-16 md:pb-0" dir="rtl">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface/95 backdrop-blur px-4 py-3">
        <Link to="/shop/home" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white">ن</span>
          <span className="text-sm font-bold">پرتال مشتریان نگار آذین فدک</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 mr-auto text-sm">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={`flex items-center gap-1.5 rounded-md px-3 py-2 transition-colors ${loc.pathname === n.to ? "bg-primary-50 text-primary-700 font-semibold" : "text-text-muted hover:bg-bg hover:text-text"}`}>
              <Icon name={n.icon} size={16} />{n.label}
            </Link>
          ))}
        </nav>
        <Link to="/shop/notifications" className="grid h-9 w-9 place-items-center rounded-md text-text-muted hover:bg-bg"><Icon name="bell" size={19} /></Link>
        <Link to="/shop/profile"><Avatar name="مشتری نمونه" size={32} /></Link>
      </header>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
      <nav className="fixed bottom-0 inset-x-0 z-30 grid grid-cols-5 border-t border-border bg-surface/95 backdrop-blur md:hidden">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className={`flex flex-col items-center gap-0.5 py-2 text-[10.5px] ${loc.pathname === n.to ? "text-primary-600" : "text-text-muted"}`}>
            <Icon name={n.icon} size={19} />{n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
};
