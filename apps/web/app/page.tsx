import type { Metadata } from "next";
import SookarHome from "./sookar-home";

export const metadata: Metadata = {
  title: "سوکار | بازارگاه یکپارچه خرید و فروش",
  description: "در بازارگاه سوکار محصولات و فروشگاه‌ها را یک‌جا ببینید، اطلاعات کالا را بررسی کنید و انتخاب آگاهانه‌تری داشته باشید.",
  alternates: { canonical: "/marketplace" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "https://sookar.ir/marketplace",
    siteName: "سوکار",
    title: "سوکار | بازارگاه یکپارچه خرید و فروش",
    description: "کشف کالا، بررسی اطلاعات و دسترسی به فروشگاه‌های ثبت‌شده در یک تجربهٔ یکپارچه."
  },
  twitter: {
    card: "summary_large_image",
    title: "سوکار | بازارگاه یکپارچه خرید و فروش",
    description: "کشف کالا، بررسی اطلاعات و دسترسی به فروشگاه‌های ثبت‌شده."
  }
};

export default function HomePage() {
  return <SookarHome />;
}
