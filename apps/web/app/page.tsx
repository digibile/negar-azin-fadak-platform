import type { Metadata } from "next";
import StorePage from "./store/page";

export const metadata: Metadata = {
  title: "سوکار | بازارگاه یکپارچه خرید از فروشندگان معتبر",
  description: "در بازارگاه سوکار، کالاها و فروشگاه‌های ثبت‌شده را کشف و مقایسه کنید؛ محصولات، فروشندگان و خدمات خرید اعتباری را در یک مسیر یکپارچه ببینید.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "https://sookar.ir/",
    siteName: "سوکار",
    title: "سوکار | بازارگاه یکپارچه خرید و فروش",
    description: "کالاها و فروشگاه‌های ثبت‌شده را در بازارگاه سوکار پیدا و مقایسه کنید."
  }
};

export default function HomePage() {
  return <StorePage variant="default" />;
}
