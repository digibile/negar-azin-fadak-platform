import type { Metadata } from "next";
import StorePage from "../page";

export const metadata: Metadata = {
  title: "کیپا | KIPA · پیش‌نمایش قالب",
  description: "پیش‌نمایش مستقل قالب کیپا با طراحی راست‌چین، واکنش‌گرا و متصل به کاتالوگ واقعی بازارگاه.",
  robots: { index: false, follow: false }
};

export default function KipaTemplatePreview() {
  return <StorePage variant="kipa" />;
}
