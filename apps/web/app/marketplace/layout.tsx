import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "فروشگاه سوکار",
  description: "فروشگاه سوکار برای کشف فروشگاه‌ها، فروشندگان و محصولات فعال.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "فروشگاه سوکار",
    description: "کشف فروشگاه‌ها، فروشندگان و محصولات فعال در فروشگاه سوکار.",
    type: "website"
  }
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
