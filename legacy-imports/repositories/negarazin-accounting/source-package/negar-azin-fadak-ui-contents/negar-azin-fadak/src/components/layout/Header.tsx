import React from "react";
import { Link } from "react-router-dom";
import { Avatar } from "../ui/Misc";
import { Dropdown } from "../ui/Nav";
import { Input } from "../ui/Form";
import { Icon } from "../ui/Icon";
import { AVAILABLE_THEMES } from "../../theme/themes";
import { useTheme } from "../../theme/ThemeProvider";
import { mockNotifications } from "../../mock/notifications";
import { relativeTime } from "../../lib/utils/format";

export const Header: React.FC<{ onMenuClick: () => void; portalLabel: string; onSwitchPortal?: () => void }> = ({ onMenuClick, portalLabel, onSwitchPortal }) => {
  const { theme, setTheme } = useTheme();
  const unread = mockNotifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-h)] items-center gap-3 border-b border-border bg-surface/95 backdrop-blur px-3 md:px-5">
      <button onClick={onMenuClick} className="grid h-9 w-9 place-items-center rounded-md text-text-muted hover:bg-bg lg:hidden">
        <Icon name="menu" size={20} />
      </button>

      <div className="hidden md:flex flex-1 max-w-md relative">
        <Icon name="search" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <Input placeholder="جستجو در منوی مرکزی سازمان..." className="pr-9" />
      </div>

      <div className="flex items-center gap-1.5 mr-auto">
        <button onClick={onSwitchPortal} className="hidden md:flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-bg hover:text-text transition-colors">
          <Icon name="repeat" size={14} /> {portalLabel}
        </button>

        <Dropdown trigger={<button className="grid h-9 w-9 place-items-center rounded-md text-text-muted hover:bg-bg hover:text-text transition-colors"><Icon name="palette" size={18} /></button>}>
          <p className="px-3 py-2 text-xs font-medium text-text-muted">پوسته نمایشی (Theme)</p>
          {AVAILABLE_THEMES.map((t) => (
            <button key={t.id} onClick={() => setTheme(t.id)} className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-bg ${theme === t.id ? "font-semibold" : ""}`}>
              <span className="h-3.5 w-3.5 rounded-full ring-2 ring-white/40" style={{ background: t.swatch }} />{t.label}
              {theme === t.id && <Icon name="check" size={14} className="mr-auto text-primary-600" />}
            </button>
          ))}
        </Dropdown>

        <Dropdown trigger={
          <button className="relative grid h-9 w-9 place-items-center rounded-md text-text-muted hover:bg-bg hover:text-text transition-colors">
            <Icon name="bell" size={18} />
            {unread > 0 && <span className="absolute top-1.5 left-1.5 h-2 w-2 rounded-full bg-danger-500 ring-2 ring-surface" />}
          </button>
        }>
          <div className="w-72 max-h-80 overflow-y-auto">
            <p className="px-3 py-2 text-xs font-semibold border-b border-border">اعلان‌ها</p>
            {mockNotifications.slice(0, 5).map((n) => (
              <div key={n.id} className="flex gap-2.5 border-b border-border/60 px-3 py-2.5 text-xs last:border-0">
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${n.read ? "bg-border" : "bg-primary-500"}`} />
                <div>
                  <p className={n.read ? "text-text-muted" : "font-medium"}>{n.title}</p>
                  <p className="mt-0.5 text-text-muted">{relativeTime(n.createdAt)}</p>
                </div>
              </div>
            ))}
            <Link to="/master/notifications" className="block px-3 py-2 text-center text-xs text-primary-600 hover:bg-bg">مشاهده همه</Link>
          </div>
        </Dropdown>

        <Dropdown trigger={
          <button className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-bg transition-colors">
            <Avatar name="سارا محمدی" size={32} />
          </button>
        }>
          <div className="w-56">
            <div className="border-b border-border px-3 py-2.5">
              <p className="text-sm font-medium">سارا محمدی</p>
              <p className="text-xs text-text-muted">مدیر ارشد سیستم</p>
            </div>
            <Link to="/master/profile" className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-bg"><Icon name="user-round" size={15} className="text-text-muted" />پروفایل من</Link>
            <Link to="/master/account" className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-bg"><Icon name="userCog" size={15} className="text-text-muted" />حساب کاربری</Link>
            <Link to="/master/settings" className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-bg"><Icon name="settings" size={15} className="text-text-muted" />تنظیمات</Link>
            <Link to="/auth/login-history" className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-bg"><Icon name="history" size={15} className="text-text-muted" />تاریخچه ورود</Link>
            <Link to="/auth/portal-selection" className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-bg"><Icon name="repeat" size={15} className="text-text-muted" />انتخاب پرتال</Link>
            <Link to="/auth/logout" className="flex items-center gap-2.5 border-t border-border px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"><Icon name="logout" size={15} />خروج از حساب</Link>
          </div>
        </Dropdown>
      </div>
    </header>
  );
};
