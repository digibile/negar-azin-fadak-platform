import type { Metadata } from "next";
import StorePage from "./store/page";

export const metadata: Metadata = {
  title: "سوکار | بازارگاه یکپارچه خرید و فروش",
  description: "بازارگاه سوکار برای کشف کالاها، بررسی اطلاعات محصولات و دسترسی به فروشندگان ثبت‌شده در یک تجربه یکپارچه.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "https://sookar.ir/",
    siteName: "سوکار",
    title: "سوکار | بازارگاه یکپارچه خرید و فروش",
    description: "کشف کالا، بررسی اطلاعات و دسترسی به فروشندگان بازارگاه سوکار."
  },
  twitter: {
    card: "summary_large_image",
    title: "سوکار | بازارگاه یکپارچه خرید و فروش",
    description: "کشف کالا، بررسی اطلاعات و دسترسی به فروشندگان بازارگاه سوکار."
  }
};

export default function HomePage() {
  return <StorePage variant="marketplace-pro" />;
}
