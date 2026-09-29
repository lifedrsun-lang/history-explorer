import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/teacher/atc-confirmations/mail-{preview,send}": [
      "./public/fonts/noto-sans-kr-*.woff2",
      "./public/images/atc-logo.png",
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
  },
};

export default nextConfig;
