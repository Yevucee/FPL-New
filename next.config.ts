import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Private planner and auth responses must not be cached; enforced per-route.
  poweredByHeader: false,
};

export default nextConfig;
