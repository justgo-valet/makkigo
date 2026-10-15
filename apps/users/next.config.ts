import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  devIndicators: false,
  output: "standalone",
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  transpilePackages: [
    "@makkigo/ui",
    "@makkigo/api-client",
    "@makkigo/auth",
    "@makkigo/push",
    "@makkigo/ticket-design",
    "database",
  ],
};

export default nextConfig;
