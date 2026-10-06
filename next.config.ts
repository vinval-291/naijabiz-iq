import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only "N" badge: keep it off the mobile bottom tab bar.
  devIndicators: { position: "top-right" },
};

export default nextConfig;
