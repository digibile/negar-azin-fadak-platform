import type { Metadata } from "next";
import StorePage from "../page";

export const metadata: Metadata = {
  title: "قالب فروشگاهی دیجی‌کالا | صفحه اصلی و جزئیات محصول",
  description: "قالب فروشگاهی مستقل با دسته‌بندی‌ها، کاتالوگ محصولات و صفحه جزئیات محصول واکنش‌گرا؛ بدون وابستگی رسمی به برندهای دیگر.",
  robots: { index: false, follow: false }
};

export default function DigikalaTemplatePreview() {
  return <StorePage variant="digikala" />;
}
