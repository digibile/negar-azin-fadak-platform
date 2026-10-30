import React from "react";
import { NavLink } from "react-router-dom";
import { Icon, type IconName } from "../ui/Icon";

const items: { to: string; icon: IconName; label: string }[] = [
  { to: "/master/dashboard", icon: "dashboard", label: "داشبورد" },
  { to: "/commerce/orders", icon: "invoice", label: "سفارش‌ها" },
  { to: "/customers", icon: "team", label: "مشتریان" },
  { to: "/master/notifications", icon: "bell", label: "اعلان‌ها" },
  { to: "/master/account", icon: "user-round", label: "حساب" },
];

export const BottomNav: React.FC = () => (
  <nav className="fixed bottom-0 inset-x-0 z-30 grid grid-cols-5 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
    {items.map((it) => (
      <NavLink key={it.to} to={it.to} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[10.5px] ${isActive ? "text-primary-600" : "text-text-muted"}`}>
        <Icon name={it.icon} size={19} />{it.label}
      </NavLink>
    ))}
  </nav>
);
