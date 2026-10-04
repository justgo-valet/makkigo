import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  agentRules: false,
  transpilePackages: ['@makkigo/ui'],
}

export default nextConfig
