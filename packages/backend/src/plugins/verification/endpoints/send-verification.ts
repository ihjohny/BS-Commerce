/**
 * POST /api/auth/send-verification
 * Sends a verification code or link to the given email or phone.
 * Optional auth: if authenticated, identifier must match user's email or phone.
 * Rate limit: 60s cooldown per identifier.
 */
import type { Endpoint } from 'payload'
import { sendVerificationLink } from '../adapters/email-link'
import { sendVerificationOTP } from '../adapters/email-otp'
import { generateVerificationToken, generateOTP } from '../lib/generate-code'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COOLDOWN_MS = 60 * 1000 // 60 seconds
const DEFAULT_EMAIL_TOKEN_EXPIRY_MINUTES = 30
const DEFAULT_OTP_EXPIRY_SECONDS = 300

function getEmailStrategy(): 'link' | 'otp' {
  const v = process.env.EMAIL_VERIFICATION_STRATEGY?.toLowerCase()
  return v === 'otp' ? 'otp' : 'link'
}

function getOTPLength(): number {
  const n = parseInt(process.env.EMAIL_VERIFICATION_OTP_LENGTH || '6', 10)
  return Number.isFinite(n) && n >= 4 && n <= 8 ? n : 6
}

export const sendVerificationEndpoint: Endpoint = {
  path: '/auth/send-verification',
  method: 'post',
  handler: async (req) => {
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

    const trimmed = String(identifier).trim()
    if (idType === 'email') {
      if (!EMAIL_REGEX.test(trimmed)) {
        return Response.json({ error: 'Invalid email address.' }, { status: 400 })
      }
    }
    // Phone: accept any non-empty string for now

    if (idType === 'phone') {
      return Response.json(
        { error: 'Phone verification is not yet implemented (Phase 6.2).' },
        { status: 501 }
      )
    }

    // Optional: require auth and that identifier belongs to user
    const user = req.user
    if (user?.email && trimmed.toLowerCase() !== String(user.email).trim().toLowerCase()) {
      return Response.json(
        { error: 'Identifier does not match the authenticated user.' },
        { status: 403 }
      )
    }

    const payload = req.payload

    // Cooldown: last code for this identifier within 60s
    const { docs } = await payload.find({
      collection: 'verification-codes',
      where: {
        identifier: { equals: trimmed },
        type: { equals: 'email' },
      },
      limit: 1,
      sort: '-createdAt',
      req,
      overrideAccess: true,
    })
    const last = docs[0]
    if (last?.createdAt) {
      const created = new Date(last.createdAt).getTime()
      if (Date.now() - created < COOLDOWN_MS) {
        return Response.json(
          { error: 'Please wait before requesting another code.', retryAfter: 60 },
          { status: 429 }
        )
      }
    }

    const strategy = getEmailStrategy()
    const expiresAt = new Date()

    if (strategy === 'link') {
      const token = generateVerificationToken()
      const expiryMinutes = parseInt(process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY_MINUTES || String(DEFAULT_EMAIL_TOKEN_EXPIRY_MINUTES), 10) || DEFAULT_EMAIL_TOKEN_EXPIRY_MINUTES
      expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes)

      await payload.create({
        collection: 'verification-codes',
        data: {
          identifier: trimmed,
          type: 'email',
          code: token,
          expiresAt: expiresAt.toISOString(),
        },
        req,
        overrideAccess: true,
      })

      const sent = await sendVerificationLink(trimmed, token, expiryMinutes)
      if (!sent) {
        return Response.json({ error: 'Failed to send verification email.' }, { status: 502 })
      }
      return Response.json({ success: true, message: 'Verification link sent to your email.' })
    }

    // OTP
    const code = generateOTP(getOTPLength())
    const expirySeconds = parseInt(process.env.EMAIL_VERIFICATION_OTP_EXPIRY || String(DEFAULT_OTP_EXPIRY_SECONDS), 10) || DEFAULT_OTP_EXPIRY_SECONDS
    expiresAt.setSeconds(expiresAt.getSeconds() + expirySeconds)

    await payload.create({
      collection: 'verification-codes',
      data: {
        identifier: trimmed,
        type: 'email',
        code,
        expiresAt: expiresAt.toISOString(),
      },
      req,
      overrideAccess: true,
    })

    const sent = await sendVerificationOTP(trimmed, code, expirySeconds)
    if (!sent) {
      return Response.json({ error: 'Failed to send verification code.' }, { status: 502 })
    }
    return Response.json({ success: true, message: 'Verification code sent to your email.' })
  },
}
