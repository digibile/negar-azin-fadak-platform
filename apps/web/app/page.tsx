import type { Metadata } from "next";
import DigibileHome from "./digibile-home";

export const metadata: Metadata = {
  title: "سوکار | بازارگاه اینترنتی خرید و فروش",
  description: "در بازارگاه سوکار، کالاها و فروشگاه‌های ثبت‌شده را کشف و مقایسه کنید و مسیر خرید را از یک تجربه یکپارچه دنبال کنید.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "https://sookar.ir/",
    siteName: "سوکار",
    title: "سوکار | بازارگاه اینترنتی خرید و فروش",
    description: "کالاها و فروشگاه‌های ثبت‌شده را در بازارگاه سوکار پیدا و مقایسه کنید."
  },
  twitter: {
    card: "summary_large_image",
    title: "سوکار | بازارگاه اینترنتی خرید و فروش",
    description: "کالاها و فروشگاه‌های ثبت‌شده را در بازارگاه سوکار پیدا و مقایسه کنید."
  }
};

export default function HomePage() {
  return <DigibileHome />;
}
