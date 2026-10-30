import React from "react";
import { AppShell } from "./AppShell";
import { portalNavs } from "./nav.config";

const PORTAL_LABELS: Record<string, string> = {
  "super-admin": "پرتال مدیریت ارشد",
  finance: "پرتال مالی",
  credit: "پرتال اعتبار",
  commerce: "پرتال تجارت",
  merchant: "پرتال پذیرندگان",
  store: "پرتال فروشگاه",
  accounting: "پرتال حسابداری",
};

export const PortalShell: React.FC<{ portalKey: string; children: React.ReactNode }> = ({ portalKey, children }) => (
  <AppShell nav={portalNavs[portalKey] ?? portalNavs["super-admin"]} portalLabel={PORTAL_LABELS[portalKey] ?? "مرکز مدیریت نگار آذین فدک"}>
    {children}
  </AppShell>
);
