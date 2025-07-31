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
        source: "/api/projects/:path*",
        destination:
          process.env.NODE_ENV === "development"
            ? "http://127.0.0.1:8000/api/projects/:path*"
            : "/api/projects/:path*",
      },
    ];
  },
};

export default nextConfig;
