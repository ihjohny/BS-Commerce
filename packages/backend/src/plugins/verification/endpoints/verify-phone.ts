/**
 * POST /api/auth/verify-phone
 * Phase 6.2. Verifies phone using code. On success sets user.phoneVerified = true.
 */
import type { Endpoint } from 'payload'

export const verifyPhoneEndpoint: Endpoint = {
  path: '/auth/verify-phone',
  method: 'post',
  handler: async (req) => {
    const data = (await (req as Request).json?.().catch(() => ({}))) || {}
    const { code, phone } = data

    if (!code || !phone || typeof code !== 'string' || typeof phone !== 'string') {
      return Response.json(
        { error: 'code and phone are required.' },
        { status: 400 }
      )
    }

    const phoneTrimmed = String(phone).trim()
    const codeTrimmed = code.trim()
    if (!phoneTrimmed || !codeTrimmed) {
      return Response.json(
        { error: 'code and phone are required.' },
        { status: 400 }
      )
    }

    const payload = req.payload

    const { docs } = await payload.find({
      collection: 'verification-codes',
      where: {
        type: { equals: 'phone' },
        identifier: { equals: phoneTrimmed },
        code: { equals: codeTrimmed },
        used: { equals: false },
      },
      limit: 1,
      req,
      overrideAccess: true,
    })
    const record = docs[0]
    if (!record) {
      return Response.json(
        { error: 'Invalid or expired verification code.' },
        { status: 400 }
      )
    }
    const expiresAt = record.expiresAt ? new Date(record.expiresAt).getTime() : 0
    if (Date.now() > expiresAt) {
      return Response.json(
        { error: 'Verification code has expired. Please request a new one.' },
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

    const { docs: users } = await payload.find({
      collection: 'users',
      where: { phone: { equals: phoneTrimmed } },
      limit: 1,
    })
    const user = users[0]
    if (user) {
      await payload.update({
        collection: 'users',
        id: user.id,
        data: { phoneVerified: true },
        req,
        overrideAccess: true,
      })
    }

    return Response.json({ success: true, message: 'Phone verified.' })
  },
}
