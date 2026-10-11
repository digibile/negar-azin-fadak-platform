import type { Metadata } from "next";
import StorePage from "./store/page";

export const metadata: Metadata = {
  title: "سوکار | فروشگاه کالای دیجیتال",
  description: "تجربه فروشگاهی کالای دیجیتال با جستجو و دسته‌بندی محصولات ثبت‌شده در کاتالوگ سوکار.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "https://sookar.ir/",
    siteName: "سوکار",
    title: "سوکار | فروشگاه کالای دیجیتال",
    description: "محصولات ثبت‌شده را جستجو و دسته‌بندی کنید."
  }
};

export default function HomePage() {
  return <StorePage variant="technolife" />;
}
