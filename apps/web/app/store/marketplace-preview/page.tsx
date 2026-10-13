import type { Metadata } from "next";
import StorePage from "../page";

export const metadata: Metadata = {
  title: "پیش‌نمایش بازارگاه حرفه‌ای | نگار آذین فدک",
  description: "پیش‌نمایش مستقل و واکنش‌گرای بازارگاه نگار آذین فدک، متصل به کاتالوگ محصولات پروژه.",
  robots: { index: false, follow: false }
};

/**
 * Keep this preview connected to the shared storefront and public marketplace API.
 * Do not introduce mock product or financing data in this production preview route.
 */
export default function MarketplaceTemplatePreviewRoute() {
  return <StorePage variant="marketplace-pro" />;
}
