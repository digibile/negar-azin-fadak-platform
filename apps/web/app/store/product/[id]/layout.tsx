import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "محصول",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } }
};

export default function ProductIdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
