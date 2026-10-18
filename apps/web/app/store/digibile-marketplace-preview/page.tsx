import type { Metadata } from "next";
import DigibileHome from "../../digibile-home";

export const metadata: Metadata = {
  title: { absolute: "پیش‌نمایش قالب دیجی‌بایل | بازارگاه حرفه‌ای" },
  description: "پیش‌نمایش مستقل قالب فروشگاهی دیجی‌بایل برای بررسی در کتابخانه قالب‌های مدیر ارشد.",
  robots: { index: false, follow: false }
};

export default function DigibileMarketplaceTemplatePreview() {
  return <DigibileHome />;
}
