/**
 * POST /api/auth/verify-email
 * Verifies email using token (link strategy) or code + email (OTP strategy).
 * On success, sets user.emailVerified = true for the user with that email.
 */
import type { Endpoint } from 'payload'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const verifyEmailEndpoint: Endpoint = {
  path: '/auth/verify-email',
  method: 'post',
  handler: async (req) => {
    const data = (await (req as Request).json?.().catch(() => ({}))) || {}
    const { token, code, email } = data

    const payload = req.payload

    // Link strategy: token in body (e.g. from frontend page that got ?token= from URL)
    if (token && typeof token === 'string' && token.trim()) {
      const t = token.trim()
      const { docs } = await payload.find({
        collection: 'verification-codes',
        where: {
          type: { equals: 'email' },
          code: { equals: t },
          used: { equals: false },
        },
        limit: 1,
        req,
        overrideAccess: true,
      })
      const record = docs[0]
      if (!record) {
        return Response.json(
          { error: 'Invalid or expired verification link.' },
          { status: 400 }
        )
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
    }

    // OTP strategy: code + email
    if (code && email && typeof code === 'string' && typeof email === 'string') {
      const emailTrimmed = email.trim().toLowerCase()
      if (!EMAIL_REGEX.test(emailTrimmed)) {
        return Response.json({ error: 'Invalid email address.' }, { status: 400 })
      }
      const codeTrimmed = code.trim()

      const { docs } = await payload.find({
        collection: 'verification-codes',
        where: {
          type: { equals: 'email' },
          identifier: { equals: emailTrimmed },
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
        where: { email: { equals: emailTrimmed } },
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
    }

    return Response.json(
      { error: 'Provide either token (link) or code and email (OTP).' },
      { status: 400 }
    )
  },
}
