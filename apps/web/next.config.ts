import type { NextConfig } from "next";

const isPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath: isPages ? "/negar-azin-fadak-platform" : "",
  assetPrefix: isPages ? "/negar-azin-fadak-platform/" : undefined,
  images: { unoptimized: true },
  trailingSlash: true
};

export default nextConfig;
