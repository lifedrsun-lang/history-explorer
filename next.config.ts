import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/teacher/presentations",
        has: [
          {
            type: "query",
            key: "category",
            value: "coding",
          },
        ],
        destination: "/teacher/presentations/coding",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
