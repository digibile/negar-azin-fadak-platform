import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "بازارگاه سوکار",
  description: "بازارگاه سوکار برای کشف فروشگاه‌ها، فروشندگان و محصولات فعال.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "بازارگاه سوکار",
    description: "کشف فروشگاه‌ها، فروشندگان و محصولات فعال در بازارگاه سوکار.",
    type: "website"
  }
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
