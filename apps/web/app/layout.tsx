import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://sookar.ir";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "فروشگاه اینترنتی سوکار",
    template: "%s | سوکار"
  },
  description: "خرید یکپارچه کالا از فروشگاه‌ها و فروشندگان ثبت‌شده در سوکار.",
  applicationName: "سوکار | فروشگاه اینترنتی",
  keywords: [
    "سوکار",
    "فروشگاه اینترنتی سوکار",
        "خرید اینترنتی",
    "فروشگاه‌های آنلاین",
    "محصولات و فروشندگان",
    "خرید اعتباری"
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: siteUrl,
    siteName: "سوکار",
    title: "فروشگاه اینترنتی سوکار و بازارگاه چندفروشنده",
    description: "خرید اینترنتی از فروشگاه‌ها و فروشندگان ثبت‌شده در سوکار."
  },
  twitter: {
    card: "summary_large_image",
    title: "فروشگاه اینترنتی سوکار و بازارگاه چندفروشنده",
    description: "خرید اینترنتی از فروشگاه‌ها و فروشندگان ثبت‌شده در بازارگاه سوکار."
  }
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  name: "سوکار",
  url: siteUrl,
  description: "فروشگاه اینترنتی سوکار"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
