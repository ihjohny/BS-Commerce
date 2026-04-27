import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['ioredis', 'payloadcms-redis-plugin'],
  // When running E2E in parallel, multiple Next dev servers must not share the same build cache.
  // `run-e2e-safe.mjs` sets `NEXT_DIST_DIR` per slot.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Parallel `next dev` on Windows races on a single tsconfig.json (TS path assertion). E2E uses a copy per slot.
  typescript: {
    tsconfigPath: process.env.E2E_TSCONFIG_PATH || 'tsconfig.json',
  },
  // CORS for /api: see `src/lib/api-cors.ts` on the catch-all API route (runtime env, multi-origin).
  // A single `Access-Control-Allow-Origin` in headers() here would break multiple storefronts.
  async headers() {
    return []
  },
}

export default withPayload(nextConfig)
