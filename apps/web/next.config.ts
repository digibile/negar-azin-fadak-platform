import type { NextConfig } from "next";

const apiInternalUrl = process.env.API_INTERNAL_URL || "http://api:4000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Vercel manages its own build output; standalone is only for the Docker deployment.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  images: { unoptimized: true },
  trailingSlash: false,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: apiInternalUrl + "/api/:path*" },
      { source: "/health", destination: apiInternalUrl + "/health" }
    ];
  }
};

export default nextConfig;
