import { fileURLToPath } from 'node:url'

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  agentRules: false,
  devIndicators: false,
  output: 'standalone',
  outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
  transpilePackages: ['@makkigo/legal', '@makkigo/ticket-design', '@makkigo/ui'],
  redirects: async () => [
    {
      source: '/booths/:boothId/payment-settings',
      destination: '/booths/:boothId/booth-info',
      permanent: false,
    },
  ],
}

export default nextConfig
