import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://negarzinfadak.ir";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/modules", "/platform", "/platform-control", "/api", "/account", "/login", "/register", "/forgot-password"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
