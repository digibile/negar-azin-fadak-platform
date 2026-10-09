import type { Metadata } from "next";
import StorePage from "../page";

export const metadata: Metadata = {
  title: "پیش‌نمایش قالب فروشگاه فناوری",
  description: "قالب مستقل فروشگاه کالای دیجیتال با جستجو و اطلاعات محصولات ثبت‌شده در کاتالوگ سوکار.",
  robots: { index: false, follow: false }
};

export default function TechnolifeTemplatePreview() {
  return <StorePage variant="technolife" />;
}
