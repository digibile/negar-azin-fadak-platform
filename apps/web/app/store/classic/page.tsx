import type { Metadata } from "next";
import ClassicStorefront from "./storefront";

export const metadata: Metadata = {
  title: "پیش‌نمایش قالب کلاسیک فروشگاه",
  description: "نسخه کلاسیک فروشگاه سوکار، نگهداری‌شده برای مقایسه و بازگشت قالب.",
  robots: { index: false, follow: false }
};

export default function ClassicTemplatePreview() {
  return <ClassicStorefront />;
}
