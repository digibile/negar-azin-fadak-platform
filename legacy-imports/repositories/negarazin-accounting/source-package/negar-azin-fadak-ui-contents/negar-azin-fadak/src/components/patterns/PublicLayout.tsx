import React from "react";
import { PublicHeader } from "../layout/PublicHeader";
import { PublicFooter } from "../layout/Footer";

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-bg" dir="rtl">
    <PublicHeader />
    <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    <PublicFooter />
  </div>
);
