import type { Metadata } from "next";
import MarketplacePage from "./MarketplacePage";

export const metadata: Metadata = {
  title: "بازارگاه سوکار | خرید و فروش یکپارچه",
  description: "کالاها، دسته‌بندی‌ها و فروشگاه‌های فعال را در بازارگاه سوکار کشف و مقایسه کنید.",
  alternates: { canonical: "/marketplace" },
  robots: { index: false, follow: true }
};

export default function MarketplaceRoute() {
  return <MarketplacePage />;
}
