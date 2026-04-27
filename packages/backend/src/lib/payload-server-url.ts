/**
 * Public URL of the Payload/Next app (API + admin).
 *
 * - `NEXT_PUBLIC_APP_URL` is inlined at build time; a wrong value breaks admin
 *   (CSRF + cookie Origin checks) in production without an obvious CORS error.
 * - `SERVER_PUBLIC_URL` / `PAYLOAD_PUBLIC_URL` are read at **runtime** (not NEXT_PUBLIC_*)
 *   so the same build can be deployed to different hosts — set the real public URL
 *   on the server only.
 */
function normalizeBase(url: string) {
  return url.replace(/\/$/, '')
}

export function getPayloadServerUrl(): string {
  return normalizeBase(
    process.env.SERVER_PUBLIC_URL ||
      process.env.PAYLOAD_PUBLIC_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000',
  )
}

/**
 * Origins allowed for Payload `cors` + `csrf` (admin + storefronts).
 * Must include the exact URL users see in the address bar (scheme + host, no path).
 */
export function getPayloadTrustedOrigins(): string[] {
  const fromExtra = (process.env.PAYLOAD_TRUSTED_ORIGINS || '')
    .split(',')
    .map((s) => normalizeBase(s.trim()))
    .filter(Boolean)

  return [
    ...new Set(
      [
        getPayloadServerUrl(),
        process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3001',
        process.env.NEXT_PUBLIC_MULTIVENDOR_STOREFRONT_URL,
        ...fromExtra,
      ]
        .filter((x): x is string => Boolean(x) && x !== 'null')
        .map((o) => normalizeBase(o!)),
    ),
  ]
}
