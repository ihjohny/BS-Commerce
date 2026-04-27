import { NextRequest, NextResponse } from 'next/server'

/**
 * CORS for /api: browsers send `Origin: <storefront>`. A single static
 * `Access-Control-Allow-Origin` in `next.config` cannot cover SV + MV + admin.
 * Match request Origin against the same allowlist as Payload (see `payload.config` cors).
 */
function normalizeOrigin(o: string) {
  return o.replace(/\/$/, '')
}

function allowedOrigins(): string[] {
  const v = [
    process.env.NEXT_PUBLIC_STOREFRONT_URL,
    process.env.NEXT_PUBLIC_MULTIVENDOR_STOREFRONT_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]
    .filter((x): x is string => Boolean(x) && x !== 'null')
    .map(normalizeOrigin)
  return [...new Set(v)]
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  const origin = request.headers.get('origin')
  const list = allowedOrigins()
  const ok =
    origin && list.length > 0
      ? list.includes(normalizeOrigin(origin))
      : false

  if (request.method === 'OPTIONS') {
    const r = new NextResponse(null, { status: 204 })
    if (ok && origin) {
      r.headers.set('Access-Control-Allow-Origin', origin)
      r.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      )
      r.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Guest-Id, Accept-Language',
      )
      r.headers.set('Access-Control-Allow-Credentials', 'true')
      r.headers.set('Vary', 'Origin')
    }
    return r
  }

  const res = NextResponse.next()
  if (ok && origin) {
    res.headers.set('Access-Control-Allow-Origin', origin)
    res.headers.set('Access-Control-Allow-Credentials', 'true')
    res.headers.set('Vary', 'Origin')
  }
  return res
}

export const config = {
  matcher: '/api/:path*',
}
