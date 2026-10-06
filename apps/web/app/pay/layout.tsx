import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "اعتبار و تسهیلات سوکار",
  description: "مرکز اعتبار و تسهیلات سوکار برای مشاهده طرح‌ها، شرایط، درخواست و بازپرداخت.",
  alternates: { canonical: "/pay" },
  openGraph: {
    title: "اعتبار و تسهیلات سوکار",
    description: "طرح‌های اعتبار خرید و تسهیلات با مسیر شفاف از درخواست تا بازپرداخت.",
    type: "website"
  }
};

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
