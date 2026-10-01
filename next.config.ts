import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/teacher/haneulbit-reports{,/pdf}": [
      "./templates/haneulbit/result-report*.html",
      "./public/fonts/noto-sans-kr-*.woff2",
      "./public/fonts/report-symbols.ttf",
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
    "/api/teacher/haneulbit-reports/hwpx": ["./templates/haneulbit/*.hwpx.json"],
    "/api/teacher/atc-confirmations/mail-{preview,send}": [
      "./public/fonts/noto-sans-kr-*.woff2",
      "./public/images/atc-logo.png",
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
  },
};

export default nextConfig;
