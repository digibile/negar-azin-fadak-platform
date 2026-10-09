import type { Metadata } from "next";
import StorePage from "../page";

export const metadata: Metadata = {
  title: "قالب فروشگاهی آوا | پیش‌نمایش",
  description: "پیش‌نمایش قالب اختصاصی آوا با طراحی مینیمال و کاتالوگ متصل به محصولات واقعی.",
  robots: { index: false, follow: false }
};

export default function AvaTemplatePreview() {
  return <StorePage variant="ava" />;
}
