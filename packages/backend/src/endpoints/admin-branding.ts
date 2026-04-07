/**
 * Public admin UI branding (logo, favicon, tagline) for login + sidebar.
 * GET /api/admin-branding — no auth; only returns non-sensitive URLs/text from Platform Settings.
 */
import type { Endpoint, PayloadRequest } from 'payload'
import { resolveAdminBrandingFromGlobal } from '../lib/admin-branding'

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' } as const

export async function adminBrandingHandler(req: PayloadRequest): Promise<Response> {
  const doc = await req.payload.findGlobal({
    slug: 'platform-settings',
    depth: 2,
    overrideAccess: true,
    req,
  })
  const body = resolveAdminBrandingFromGlobal(doc as Record<string, unknown>, req.payload)
  return Response.json(body, { headers: NO_STORE })
}

export const adminBrandingEndpoint: Endpoint = {
  path: '/admin-branding',
  method: 'get',
  handler: async (req) => adminBrandingHandler(req),
}
