import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@makkigo/ui", "@makkigo/api-client", "@makkigo/auth", "database"],
};

export default nextConfig;
