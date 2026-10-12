"import type { Metadata } from "next";
import StorePage from "../page";

export const metadata: Metadata = {
  title: "بازارگاه حرفه‌ای | پیش‌نمایش قالب نگار آذین فدک",
  description: "پیش‌نمایش واکنش‌گرای بازارگاه حرفه‌ای با جست‌وجو، دسته‌بندی، کارت محصول و کاتالوگ متصل به سرویس واقعی.",
  robots: { index: false, follow: false }
};

/**
 * This route deliberately reuses the shared storefront implementation.
 * Catalog, product links, cart actions, theme tokens and responsive behavior
 * stay connected to the existing commerce UI instead of becoming a dead mockup.
 */
export default function MarketplaceProTemplatePreview() {
  return <StorePage variant="marketplace-pro" />;
}
