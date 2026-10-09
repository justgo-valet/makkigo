import { fileURLToPath } from 'node:url'

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  agentRules: false,
  output: 'standalone',
  outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
  transpilePackages: ['@makkigo/ui'],
}

export default nextConfig
