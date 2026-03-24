import type { Endpoint } from 'payload'

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
    const trimmed = typeof token === 'string' ? token.trim() : ''

    if (!trimmed) {
      return Response.json({ error: 'Verification token is required.' }, { status: 400 })
    }

    const payload = req.payload

    const { docs } = await payload.find({
      collection: 'verification-codes',
      where: {
        type: { equals: 'email' },
        code: { equals: trimmed },
        used: { equals: false },
      },
      limit: 1,
      req,
      overrideAccess: true,
    })

    const record = docs[0]
    if (!record) {
      return Response.json({ error: 'Invalid or expired verification link.' }, { status: 400 })
    }

    const expiresAt = record.expiresAt ? new Date(record.expiresAt).getTime() : 0
    if (Date.now() > expiresAt) {
      return Response.json(
        { error: 'Verification link has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    await payload.update({
      collection: 'verification-codes',
      id: record.id,
      data: { used: true, usedAt: new Date().toISOString() },
      req,
      overrideAccess: true,
    })

    const identifier = String(record.identifier).trim().toLowerCase()
    const { docs: users } = await payload.find({
      collection: 'users',
      where: { email: { equals: identifier } },
      limit: 1,
    })
    const user = users[0]
    if (user) {
      await payload.update({
        collection: 'users',
        id: user.id,
        data: { emailVerified: true },
        req,
        overrideAccess: true,
      })
    }

    return Response.json({ success: true, message: 'Email verified.' })
  },
}

