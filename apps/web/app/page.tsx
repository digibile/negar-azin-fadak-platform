import type { Metadata } from "next";
import DigibileHome from "./digibile-home";

export const metadata: Metadata = {
  title: { absolute: "دیجی‌بایل | بازارگاه آنلاین خرید و انتخاب کالا" },
  description: "در بازارگاه دیجی‌بایل، دسته‌بندی‌های محبوب را کشف کنید، کالاها را بررسی کنید و انتخاب آگاهانه‌تری داشته باشید.",
  alternates: { canonical: "https://digibile.ir/" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "https://digibile.ir/",
    siteName: "دیجی‌بایل",
    title: "دیجی‌بایل | بازارگاه آنلاین خرید و انتخاب کالا",
    description: "تجربه‌ای تازه برای کشف، بررسی و انتخاب کالاها در بازارگاه دیجی‌بایل."
  },
  twitter: {
    card: "summary_large_image",
    title: "دیجی‌بایل | بازارگاه آنلاین خرید و انتخاب کالا",
    description: "تجربه‌ای تازه برای کشف، بررسی و انتخاب کالاها در بازارگاه دیجی‌بایل."
  }
};

export default function HomePage() {
  return <DigibileHome />;
}
