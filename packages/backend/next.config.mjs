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
  // Allow cross-origin requests from the storefront
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3001',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'Content-Type, Authorization, X-Guest-Id, Accept-Language',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ]
  },
}

export default withPayload(nextConfig)
