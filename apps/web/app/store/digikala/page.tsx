import type { Metadata } from "next";
import StorePage from "../page";

export const metadata: Metadata = {
  title: "پیش‌نمایش قالب فروشگاهی قرمز",
  description: "پیش‌نمایش قالب فروشگاهی الهام‌گرفته از الگوهای رایج بازارگاه‌های بزرگ؛ بدون وابستگی رسمی به برندهای دیگر.",
  robots: { index: false, follow: false }
};

export default function DigikalaTemplatePreview() {
  return <StorePage variant="digikala" />;
}
