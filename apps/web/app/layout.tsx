import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "پلتفرم بیزینس نگار آذین فدک",
  description: "سامانه یکپارچه مدیریت کسب‌وکار نگار آذین فدک"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
