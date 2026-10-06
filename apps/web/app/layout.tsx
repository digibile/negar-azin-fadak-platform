import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://negarzinfadak.ir";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "پلتفرم بیزینس نگار آذین فدک ایران",
    template: "%s | نگار آذین فدک"
  },
  description: "سامانه یکپارچه مدیریت کسب‌وکار نگار آذین فدک ایران؛ مدیریت سازمان، مالی و حسابداری، تجارت، اعتبار، اسناد و عملیات در یک مرکز مدیریت.",
  applicationName: "مرکز مدیریت نگار آذین فدک",
  keywords: [
    "نگار آذین فدک",
    "سامانه مدیریت کسب‌وکار",
    "مرکز مدیریت سازمان",
    "حسابداری و مالی",
    "مدیریت فروشگاه",
    "اعتبار و تسهیلات",
    "مدیریت اسناد",
    "مدیریت سازمان"
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: siteUrl,
    siteName: "نگار آذین فدک",
    title: "پلتفرم بیزینس نگار آذین فدک ایران",
    description: "سامانه یکپارچه مدیریت کسب‌وکار نگار آذین فدک ایران."
  },
  twitter: {
    card: "summary_large_image",
    title: "پلتفرم بیزینس نگار آذین فدک ایران",
    description: "سامانه یکپارچه مدیریت کسب‌وکار نگار آذین فدک ایران."
  }
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "نگار آذین فدک ایران",
  url: siteUrl,
  description: "پلتفرم یکپارچه مدیریت کسب‌وکار نگار آذین فدک ایران"
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
