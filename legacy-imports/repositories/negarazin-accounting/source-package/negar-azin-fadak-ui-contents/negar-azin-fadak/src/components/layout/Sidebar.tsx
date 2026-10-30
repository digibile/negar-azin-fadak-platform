import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { NavItem } from "./nav.config";
import { Icon } from "../ui/Icon";

const NavGroup: React.FC<{ item: NavItem; collapsed: boolean }> = ({ item, collapsed }) => {
  const loc = useLocation();
  const hasChildren = !!item.children?.length;
  const isChildActive = item.children?.some((c) => c.to && loc.pathname.startsWith(c.to));
  const [open, setOpen] = useState(!!isChildActive);

  if (!hasChildren) {
    const active = item.to && loc.pathname.startsWith(item.to);
    return (
      <Link
        to={item.to ?? "#"}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${active ? "bg-primary-50 text-primary-700 font-semibold shadow-[inset_2px_0_0_0_var(--color-primary-500)]" : "text-text-muted hover:bg-bg hover:text-text"}`}
      >
        <Icon name={item.icon} size={18} className={active ? "text-primary-600" : ""} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${isChildActive ? "text-primary-700 font-semibold" : "text-text-muted hover:bg-bg hover:text-text"}`}
      >
        <Icon name={item.icon} size={18} className={isChildActive ? "text-primary-600" : ""} />
        {!collapsed && (
          <>
            <span className="flex-1 text-right truncate">{item.label}</span>
            <Icon name="chevronDown" size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </button>
      {open && !collapsed && (
        <div className="mr-[1.15rem] mt-1 flex flex-col gap-0.5 border-r border-border pr-3">
          {item.children!.map((c) => {
            const active = c.to && loc.pathname.startsWith(c.to);
            return (
              <Link key={c.label} to={c.to ?? "#"} className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors ${active ? "bg-primary-50 text-primary-700 font-semibold" : "text-text-muted hover:bg-bg hover:text-text"}`}>
                <Icon name={c.icon} size={15} />
                <span className="truncate">{c.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<{ items: NavItem[]; collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onCloseMobile: () => void; brandLabel: string }> = ({ items, collapsed, onToggle, mobileOpen, onCloseMobile, brandLabel }) => {
  const content = (
    <>
      <div className="flex h-[var(--header-h)] items-center gap-2.5 border-b border-border px-4 shrink-0">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white shadow-sm">ن</span>
        {!collapsed && <span className="truncate text-[13px] font-bold leading-tight">{brandLabel}</span>}
        <button onClick={onToggle} className="mr-auto hidden h-8 w-8 shrink-0 place-items-center rounded-md text-text-muted hover:bg-bg lg:grid">
          <Icon name={collapsed ? "chevronFwd" : "chevronBack"} size={16} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {items.map((item) => <NavGroup key={item.label} item={item} collapsed={collapsed} />)}
      </nav>
      {!collapsed && (
        <div className="border-t border-border p-3 text-[11px] text-text-muted">
          هسته مرکزی کسب‌وکار · نسخه پیش‌نمایش UI
        </div>
      )}
    </>
  );

  return (
    <>
      <aside
        style={{ width: collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)" }}
        className="hidden lg:flex flex-col shrink-0 border-l border-border bg-surface transition-all duration-200 sticky top-0 h-screen"
      >
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="flex-1 bg-black/40" onClick={onCloseMobile} />
          <div className="w-[280px] max-w-[85vw] flex flex-col bg-surface shadow-pop h-full">{content}</div>
        </div>
      )}
    </>
  );
};
