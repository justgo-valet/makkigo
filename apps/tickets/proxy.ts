import { nextWithContentSecurityPolicy } from '@makkigo/ui/lib/contentSecurityPolicy'

import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  return nextWithContentSecurityPolicy(request)
}

export const config = {
  matcher: [
    {
      source: '/((?!api/|_next/|favicon\\.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
