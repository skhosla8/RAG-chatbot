import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
   serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
   /*outputFileTracingIncludes: {
      '/scripts/loadDb.ts': ['./node_modules/@sparticuz/chromium-min/**'],
    },
    */
};

export default nextConfig;
