/**
 * CORS for `/api/*` must run in Node route handlers, not only Edge `middleware`.
 * Edge middleware inlines `NEXT_PUBLIC_*` at build time and can return OPTIONS without
 * CORS when the allowlist is empty — so the browser reports "CORS Missing Allow Origin".
 *
 * On the server, set (comma-separated, no spaces required):
 *   CORS_ALLOWED_ORIGINS=https://your-store.com,https://your-api.com
 * Falls back to NEXT_PUBLIC_STOREFRONT_URL, NEXT_PUBLIC_MULTIVENDOR_STOREFRONT_URL, NEXT_PUBLIC_APP_URL.
 */
function normalizeOrigin(o: string) {
  return o.replace(/\/$/, '')
}

export function getApiCorsAllowedOrigins(): string[] {
  const list = process.env.CORS_ALLOWED_ORIGINS
  if (list?.trim()) {
    return [
      ...new Set(
        list
          .split(',')
          .map((s) => normalizeOrigin(s.trim()))
          .filter(Boolean),
      ),
    ]
  }
  return [
    ...new Set(
      [
        process.env.NEXT_PUBLIC_STOREFRONT_URL,
        process.env.NEXT_PUBLIC_MULTIVENDOR_STOREFRONT_URL,
        process.env.NEXT_PUBLIC_APP_URL,
      ]
        .filter((x): x is string => Boolean(x) && x !== 'null')
        .map(normalizeOrigin),
    ),
  ]
}

/** CORS-safelisted + app headers. Browser preflight may list more — we must merge. */
const DEFAULT_ALLOW_HEADERS = [
  'accept',
  'accept-language',
  'authorization',
  'content-type',
  'cookie',
  'x-guest-id',
] as const

const DEFAULT_ALLOW_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
] as const

function mergeAllowHeaders(request: Request): string {
  const fromBrowser = request.headers.get('access-control-request-headers')
  const set = new Set<string>(DEFAULT_ALLOW_HEADERS)
  if (fromBrowser) {
    for (const p of fromBrowser.split(',')) {
      const t = p.trim().toLowerCase()
      if (t) set.add(t)
    }
  }
  // Stable order: sort for determinism; browsers match case-insensitively
  return [...set].sort().join(', ')
}

function mergeAllowMethods(request: Request): string {
  const fromBrowser = request.headers.get('access-control-request-method')
  const set = new Set<string>(DEFAULT_ALLOW_METHODS)
  if (fromBrowser) {
    const t = fromBrowser.trim().toUpperCase()
    if (t) set.add(t)
  }
  return [...set].join(', ')
}

type RouteHandler = (
  request: Request,
  args: { params: Promise<{ slug?: string[] }> },
) => Promise<Response>

export function withApiCors(handler: RouteHandler): RouteHandler {
  return async (request, args) => {
    const res = await handler(request, args)
    return applyApiCors(request, res)
  }
}

export function applyApiCors(request: Request, response: Response): Response {
  const origin = request.headers.get('origin')
  if (!origin) {
    return response
  }
  const allowed = getApiCorsAllowedOrigins()
  const normalized = normalizeOrigin(origin)
  if (allowed.length === 0 || !allowed.includes(normalized)) {
    return response
  }

  const h = new Headers(response.headers)
  h.set('Access-Control-Allow-Origin', origin)
  h.set('Access-Control-Allow-Credentials', 'true')
  h.set('Vary', 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method')
  // With credentials, wildcards are invalid; the preflight’s requested headers *must* be allowed.
  // Payload’s OPTIONS can list too few — Firefox reports "CORS Missing Allow Header" if a requested header is omitted.
  h.set('Access-Control-Allow-Headers', mergeAllowHeaders(request))
  h.set('Access-Control-Allow-Methods', mergeAllowMethods(request))
  h.set('Access-Control-Max-Age', '86400')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: h,
  })
}
