import type { Endpoint } from 'payload'
import { isAdmin } from '../../../access/is-admin'

/**
 * POST /api/auth/admin/verify-identifier
 * Admin-only endpoint to manually mark an email or phone as verified.
 *
 * Body: { identifierType: 'email' | 'phone', identifier: string }
 */
export const verifyIdentifierAdminEndpoint: Endpoint = {
  path: '/auth/admin/verify-identifier',
  method: 'post',
  handler: async (req) => {
    const payload = req.payload

    // Access guard
    if (!isAdmin({ req } as never)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = (await (req as Request).json?.().catch(() => ({}))) || {}
    const { identifierType, identifier } = data

    if (!identifierType || !identifier || typeof identifier !== 'string') {
      return Response.json(
        { error: 'identifierType (email|phone) and identifier are required.' },
        { status: 400 }
      )
    }

    const idType = String(identifierType).toLowerCase()
    if (idType !== 'email' && idType !== 'phone') {
      return Response.json(
        { error: 'identifierType must be email or phone.' },
        { status: 400 }
      )
    }

    const trimmed = identifier.trim()
    const field = idType === 'email' ? 'email' : 'phone'
    const value = idType === 'email' ? trimmed.toLowerCase() : trimmed
    const where = { [field]: { equals: value } } as Record<string, unknown>

    const { docs: users } = await payload.find({
      collection: 'users',
      // Payload Where typing is index-based; use a computed key object here.
      where: where as never,
      limit: 1,
      req,
      overrideAccess: true,
    })

    const user = users[0]
    if (!user) {
      return Response.json({ error: 'User not found for given identifier.' }, { status: 404 })
    }

    const update: Record<string, unknown> =
      idType === 'email' ? { emailVerified: true } : { phoneVerified: true }

    await payload.update({
      collection: 'users',
      id: user.id,
      data: update,
      req,
      overrideAccess: true,
    })

    // Mark all active codes for this identifier/type as used for audit clarity
    const { docs: codes } = await payload.find({
      collection: 'verification-codes',
      where: {
        identifier: { equals: trimmed.toLowerCase() },
        type: { equals: idType },
        used: { equals: false },
      },
      limit: 100,
      req,
      overrideAccess: true,
    })

    const nowIso = new Date().toISOString()
    for (const code of codes) {
      await payload.update({
        collection: 'verification-codes',
        id: code.id,
        data: { used: true, usedAt: nowIso },
        req,
        overrideAccess: true,
      })
    }

    return Response.json({ success: true, message: 'Identifier marked as verified.' })
  },
}

