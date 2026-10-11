import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "سوکار | قالب فروشگاهی تکنولایف",
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
  redirect("/store/technolife");
}
