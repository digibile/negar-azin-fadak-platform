import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "فروشگاه اینترنتی سوکار",
  description: "مشاهده محصولات، فروشندگان، سفارش و خرید اعتباری در سوکار.",
  alternates: { canonical: "/store" },
  openGraph: {
    title: "فروشگاه اینترنتی سوکار",
    description: "محصولات، فروشندگان و خرید اعتباری در تجربه یکپارچه سوکار.",
    type: "website"
  }
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
