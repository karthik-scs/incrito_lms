import path from "node:path";
import type { NextConfig } from "next";

const API_ORIGIN = process.env.API_PROXY_TARGET ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // In development, list any extra origins the HMR client may come from (tunnel domains, LAN IPs).
  // Set ALLOWED_DEV_ORIGINS as a comma-separated list in .env.local — never hardcoded here.
  // This block is omitted entirely in production builds.
  ...(process.env.NODE_ENV !== "production" &&
    process.env.ALLOWED_DEV_ORIGINS && {
      allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),
    }),
  turbopack: {
    resolveAlias: {
      // @zoom/meetingsdk references this optional, unpublished package for an in-meeting
      // file-download feature this app doesn't use — stub it so bundling doesn't fail on it.
      "@zoom/download-manager": path.resolve("lib/stubs/zoom-download-manager.js").split(path.sep).join("/"),
    },
  },
  // Proxies /api and /uploads to the Express API so both the app and the API are reachable
  // through this one Next.js origin — one tunnel covers the whole app instead of needing a
  // separate public address per port.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` },
      { source: "/uploads/:path*", destination: `${API_ORIGIN}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
