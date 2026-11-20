import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'

const isDevelopment = process.env.NODE_ENV === 'development'

const buildContentSecurityPolicy = (nonce: string) =>
  [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://dapi.kakao.com https://*.amazonaws.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
  ].join('; ')

export function nextWithContentSecurityPolicy(request: NextRequest) {
  const policy = buildContentSecurityPolicy(btoa(crypto.randomUUID()))
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('Content-Security-Policy', policy)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', policy)
  return response
}
