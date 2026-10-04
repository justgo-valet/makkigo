import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@makkigo/ui", "@makkigo/auth", "database"],
};

export default nextConfig;
