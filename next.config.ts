import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Planner and league pages are force-dynamic; no static caching.
  poweredByHeader: false,
};

export default nextConfig;
