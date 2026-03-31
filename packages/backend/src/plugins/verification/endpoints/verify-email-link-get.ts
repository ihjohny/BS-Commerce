import type { Endpoint } from 'payload'
import { consumeEmailVerificationToken } from '../lib/verify-email-token'

/**
 * GET /api/auth/verify-email/:token
 * One-click email verification using token from link.
 * Mirrors the link branch of POST /auth/verify-email.
 */
export const verifyEmailLinkGetEndpoint: Endpoint = {
  path: '/auth/verify-email/:token',
  method: 'get',
  handler: async (req) => {
    const token = req.routeParams?.token || ''
    const result = await consumeEmailVerificationToken({
      token: typeof token === 'string' ? token : '',
      req,
    })
    if (!result.success) return Response.json({ error: result.error }, { status: 400 })

    return Response.json({ success: true, message: 'Email verified.' })
  },
}

