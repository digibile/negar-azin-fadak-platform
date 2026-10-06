import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://negarzinfadak.ir";

const routes = [
  "/",
  "/store",
  "/store/shop",
  "/store/faq",
  "/store/returns",
  "/store/terms",
  "/marketplace",
  "/marketplace/stores",
  "/marketplace/sellers",
  "/marketplace/products",
  "/marketplace/orders",
  "/marketplace/settlements",
  "/pay",
  "/pay/plans",
  "/pay/credit",
  "/pay/loans",
  "/pay/eligibility",
  "/pay/faq",
  "/pay/support",
  "/pay/terms"
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return routes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : path === "/store" || path === "/pay" || path === "/marketplace" ? 0.9 : 0.7
  }));
}
