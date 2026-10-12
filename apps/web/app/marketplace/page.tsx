import type { Metadata } from "next";
import MarketplacePro from "./MarketplacePro";

export const metadata: Metadata = {
  title: "بازارگاه نگار آذین فدک | Marketplace Pro",
  description: "بازارگاه حرفه‌ای نگار آذین فدک ایران؛ جست‌وجوی کالا، دسته‌بندی محصولات، اطلاعات فروشندگان و سبد خرید واکنش‌گرا.",
  robots: { index: false, follow: false }
};

export default function MarketplaceRoute() {
  return <MarketplacePro />;
}
