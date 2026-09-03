/**
 * Electronics Store Seeding Endpoint
 * POST /api/seed/electronics
 * GET  /api/seed/electronics?secret=FrontendSeed2026!
 * 
 * Clears old catalog/order data and populates Apple Gadgets BD showcase data.
 * Keeps admin account intact (frontend-seed-sv@bscommerce.local / FrontendSeed2026!).
 */
import type { Endpoint } from 'payload'
import { seedElectronicsStore } from '../lib/seed-electronics-data'

export const seedElectronicsEndpoint: Endpoint = {
  path: '/seed/electronics',
  method: 'get',
  handler: async (req) => {
    return handleSeedRequest(req)
  },
}

export const seedElectronicsPostEndpoint: Endpoint = {
  path: '/seed/electronics',
  method: 'post',
  handler: async (req) => {
    return handleSeedRequest(req)
  },
}

async function handleSeedRequest(req: any): Promise<Response> {
  const url = new URL(req.url ?? '', 'http://localhost')
  const secretParam = url.searchParams.get('secret') || url.searchParams.get('token')
  const allowedSecret = process.env.PAYLOAD_SECRET || 'FrontendSeed2026!'

  const isAdmin = req.user && req.user.role === 'admin'
  const hasValidSecret = secretParam === 'FrontendSeed2026!' || secretParam === allowedSecret

  if (!isAdmin && !hasValidSecret) {
    return Response.json(
      {
        success: false,
        error: 'Unauthorized. Admin credentials or ?secret=FrontendSeed2026! is required.',
      },
      { status: 401 }
    )
  }

  try {
    const result = await seedElectronicsStore(req.payload, {
      wipeFirst: true,
      adminEmail: 'frontend-seed-sv@bscommerce.local',
    })

    return Response.json(result, { status: 200 })
  } catch (error: any) {
    req.payload.logger.error(`[Seed Electronics Endpoint Error] ${error?.message || error}`)
    return Response.json(
      {
        success: false,
        error: error?.message || 'Failed to seed electronics store',
        stack: error?.stack,
      },
      { status: 500 }
    )
  }
}
