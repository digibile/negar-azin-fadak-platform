import type { Metadata } from "next";
import StorePage from "../store/page";

export const metadata: Metadata = {
  title: "مارکت‌پلیس پرو | سوکار دیتا‌یار",
  description: "بازارگاه حرفه‌ای سوکار دیتا‌یار با جست‌وجو، دسته‌بندی، کاتالوگ محصولات و مسیر خرید یکپارچه.",
  robots: { index: false, follow: false }
};

export default function MarketplaceRoute() {
  return <StorePage variant="marketplace-pro" />;
}
