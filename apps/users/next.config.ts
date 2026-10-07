import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  transpilePackages: ["@makkigo/ui", "@makkigo/api-client", "@makkigo/auth", "database"],
};

export default nextConfig;
