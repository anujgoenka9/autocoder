import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
    clientSegmentCache: true,
    nodeMiddleware: true
  },
  rewrites: async () => {
    return [
      {
        source: "/api/chat/:path*",
        destination:
          process.env.NODE_ENV === "development"
            ? "http://127.0.0.1:8000/api/chat/:path*"
            : "/api/chat/:path*",
      },
    ];
  },
};

export default nextConfig;
