import type { Metadata } from "next";
import DigibileHome from "./digibile-home";

export const metadata: Metadata = {
  title: "Digibile | بازارگاه خرید و فروش",
  description: "قالب Digibile، بازارگاه خرید و فروش.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "https://sookar.ir/",
    siteName: "Digibile",
    title: "Digibile | بازارگاه خرید و فروش",
    description: "قالب Digibile، بازارگاه خرید و فروش."
  },
  twitter: {
    card: "summary_large_image",
    title: "Digibile | بازارگاه خرید و فروش",
    description: "قالب Digibile، بازارگاه خرید و فروش."
  }
};

export default function HomePage() {
  return <DigibileHome />;
}
