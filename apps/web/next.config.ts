import type { NextConfig } from "next";

const apiInternalUrl = process.env.API_INTERNAL_URL || "http://api:4000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: { unoptimized: true },
  trailingSlash: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: apiInternalUrl + "/api/:path*"
      },
      {
        source: "/health",
        destination: apiInternalUrl + "/health"
      }
    ];
  }
};

export default nextConfig;
