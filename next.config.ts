import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"]
}

export default nextConfig;
