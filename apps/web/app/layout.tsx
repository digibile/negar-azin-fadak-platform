import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://sookar.ir";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "بازارگاه اینترنتی سوکار",
    template: "%s | سوکار"
  },
  description: "در بازارگاه سوکار، کالاها و فروشگاه‌های ثبت‌شده را کشف و مقایسه کنید و مسیر خرید را از یک تجربه یکپارچه دنبال کنید.",
  applicationName: "سوکار | بازارگاه یکپارچه خرید و فروش",
  keywords: [
    "سوکار",
    "بازارگاه اینترنتی سوکار",
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
    title: "سوکار | بازارگاه یکپارچه خرید و فروش",
    description: "کالاها و فروشگاه‌های ثبت‌شده را در بازارگاه سوکار پیدا و مقایسه کنید."
  },
  twitter: {
    card: "summary_large_image",
    title: "سوکار | بازارگاه یکپارچه خرید و فروش",
    description: "کالاها و فروشگاه‌های ثبت‌شده را در بازارگاه سوکار پیدا و مقایسه کنید."
  }
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  name: "سوکار",
  url: siteUrl,
  description: "بازارگاه اینترنتی سوکار برای کشف کالاها و فروشگاه‌های ثبت‌شده."
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
