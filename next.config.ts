import type { NextConfig } from "next";

const API_ORIGIN = process.env.API_PROXY_TARGET ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV !== "production" &&
    process.env.ALLOWED_DEV_ORIGINS && {
      allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),
    }),
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` },
      { source: "/uploads/:path*", destination: `${API_ORIGIN}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
