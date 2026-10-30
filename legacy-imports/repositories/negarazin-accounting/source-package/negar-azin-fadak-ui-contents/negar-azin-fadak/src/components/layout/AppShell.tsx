import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import type { NavItem } from "./nav.config";

export const AppShell: React.FC<{ children: React.ReactNode; nav: NavItem[]; portalLabel: string; brandLabel?: string }> = ({ children, nav, portalLabel, brandLabel = "نگار آذین فدک" }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-bg" dir="rtl">
      <Sidebar items={nav} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} brandLabel={brandLabel} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header onMenuClick={() => setMobileOpen(true)} portalLabel={portalLabel} onSwitchPortal={() => navigate("/auth/portal-selection")} />
        <main className="flex-1 p-4 pb-20 md:p-6 lg:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
};
