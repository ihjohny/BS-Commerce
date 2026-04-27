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
  // CORS for /api is handled in `src/middleware.ts` (multi-origin, runtime env on server).
  // A single `Access-Control-Allow-Origin` here breaks SV + MV on different public URLs.
  async headers() {
    return []
  },
}

export default withPayload(nextConfig)
