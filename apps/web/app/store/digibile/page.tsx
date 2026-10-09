import type { Metadata } from "next";
import StorePage from "../page";

export const metadata: Metadata = {
  title: "دیجی‌بایل | بازارگاه تجارت دیجیتال",
  description: "قالب اختصاصی دیجی‌بایل برای مرور محصولات و فروشندگان ثبت‌شده در بازارگاه.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "دیجی‌بایل | بازارگاه تجارت دیجیتال",
    description: "بازارگاه چندفروشنده با کاتالوگ زنده و تجربه خرید موبایل‌محور.",
    type: "website"
  }
};

export default function DigibileStorefrontPreview() {
  return <StorePage variant="digibile" />;
}
