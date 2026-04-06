/**
 * POST /api/auth/send-verification
 * Sends a verification code or link to the given email or phone.
 * Optional auth: if authenticated, identifier must match user's email or phone.
 * Rate limit: 60s cooldown per identifier.
 */
import type { Endpoint } from 'payload'
import { sendVerificationLink } from '../adapters/email-link'
import { sendVerificationOTP } from '../adapters/email-otp'
import { getPhoneAdapter } from '../adapters/get-phone-adapter'
import { generateVerificationToken, generateOTP } from '../lib/generate-code'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COOLDOWN_MS = 60 * 1000 // 60 seconds
const DEFAULT_EMAIL_TOKEN_EXPIRY_MINUTES = 30
const DEFAULT_OTP_EXPIRY_SECONDS = 300
const DEFAULT_PHONE_OTP_EXPIRY_SECONDS = 300
const DEFAULT_PHONE_OTP_LENGTH = 6
const DEFAULT_RATE_LIMIT_WINDOW_MINUTES = 10
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 10

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseBoundedPositiveInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = parsePositiveInt(raw, fallback)
  return Math.min(max, Math.max(min, parsed))
}

function getEmailStrategy(): 'link' | 'otp' {
  const v = process.env.EMAIL_VERIFICATION_STRATEGY?.toLowerCase()
  return v === 'otp' ? 'otp' : 'link'
}

function getOTPLength(): number {
  const n = parseInt(process.env.EMAIL_VERIFICATION_OTP_LENGTH || '6', 10)
  return Number.isFinite(n) && n >= 4 && n <= 8 ? n : 6
}

export type SendVerificationDeps = {
  sendVerificationLink?: typeof sendVerificationLink
  sendVerificationOTP?: typeof sendVerificationOTP
  getPhoneAdapter?: typeof getPhoneAdapter
}

export async function sendVerificationHandler(req: any, deps?: SendVerificationDeps): Promise<Response> {
  const sendLink = deps?.sendVerificationLink ?? sendVerificationLink
  const sendOtpEmail = deps?.sendVerificationOTP ?? sendVerificationOTP
  const resolvePhoneAdapter = deps?.getPhoneAdapter ?? getPhoneAdapter
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
    if (idType === 'phone') {
      if (trimmed.length < 10) {
        return Response.json({ error: 'Invalid phone number.' }, { status: 400 })
      }
    }

    // Optional: if authenticated, identifier must match user's email or phone
    const user = req.user
    if (idType === 'email' && user?.email && trimmed.toLowerCase() !== String(user.email).trim().toLowerCase()) {
      return Response.json(
        { error: 'Identifier does not match the authenticated user.' },
        { status: 403 }
      )
    }
    if (idType === 'phone' && user?.phone && trimmed !== String(user.phone).trim()) {
      return Response.json(
        { error: 'Identifier does not match the authenticated user.' },
        { status: 403 }
      )
    }

    const payload = req.payload
    const ip =
      // PayloadRequest has ip on Node; fall back to header for edge adapters
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).ip ||
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      undefined

    // Cooldown: last code for this identifier within 60s
    const { docs } = await payload.find({
      collection: 'verification-codes',
      where: {
        identifier: { equals: trimmed },
        type: { equals: idType },
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

    // Rolling window rate limit per identifier and per IP
    const windowMinutes = parsePositiveInt(
      process.env.VERIFICATION_RATE_LIMIT_WINDOW_MINUTES,
      DEFAULT_RATE_LIMIT_WINDOW_MINUTES
    )
    const maxRequests = parsePositiveInt(
      process.env.VERIFICATION_RATE_LIMIT_MAX_REQUESTS,
      DEFAULT_RATE_LIMIT_MAX_REQUESTS
    )
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()

    // Per-identifier window
    const windowForIdentifier = await payload.find({
      collection: 'verification-codes',
      where: {
        identifier: { equals: trimmed },
        createdAt: { greater_than_equal: windowStart },
      },
      limit: maxRequests + 1,
      req,
      overrideAccess: true,
    })
    if (windowForIdentifier.totalDocs >= maxRequests) {
      return Response.json(
        {
          error: 'Too many verification requests for this identifier. Please try again later.',
        },
        { status: 429 }
      )
    }

    if (ip) {
      const windowForIp = await payload.find({
        collection: 'verification-codes',
        where: {
          ip: { equals: ip },
          createdAt: { greater_than_equal: windowStart },
        },
        limit: maxRequests + 1,
        req,
        overrideAccess: true,
      })
      if (windowForIp.totalDocs >= maxRequests) {
        return Response.json(
          {
            error: 'Too many verification requests from this IP. Please try again later.',
          },
          { status: 429 }
        )
      }
    }

    // ─── Phone (Phase 6.2) ───────────────────────────────────────────────────
    if (idType === 'phone') {
      const otpLength = parseBoundedPositiveInt(
        process.env.PHONE_VERIFICATION_OTP_LENGTH,
        DEFAULT_PHONE_OTP_LENGTH,
        4,
        8
      )
      const code = generateOTP(otpLength)
      const expirySeconds = parsePositiveInt(
        process.env.PHONE_VERIFICATION_OTP_EXPIRY,
        DEFAULT_PHONE_OTP_EXPIRY_SECONDS
      )
      const expiresAt = new Date()
      expiresAt.setSeconds(expiresAt.getSeconds() + expirySeconds)

      await payload.create({
        collection: 'verification-codes',
        data: {
          identifier: trimmed,
          type: 'phone',
          code,
          expiresAt: expiresAt.toISOString(),
          ip,
        },
        req,
        overrideAccess: true,
      })

      const adapter = await resolvePhoneAdapter()
      const sent = await adapter.sendOTP(trimmed, code, expirySeconds)
      if (!sent) {
        return Response.json({ error: 'Failed to send verification code.' }, { status: 502 })
      }
      return Response.json({ success: true, message: 'Verification code sent to your phone.' })
    }

    // ─── Email ───────────────────────────────────────────────────────────────
    const strategy = getEmailStrategy()
    const expiresAt = new Date()

    if (strategy === 'link') {
      const token = generateVerificationToken()
      const expiryMinutes = parsePositiveInt(
        process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY_MINUTES,
        DEFAULT_EMAIL_TOKEN_EXPIRY_MINUTES
      )
      expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes)

      await payload.create({
        collection: 'verification-codes',
        data: {
          identifier: trimmed,
          type: 'email',
          code: token,
          expiresAt: expiresAt.toISOString(),
          ip,
        },
        req,
        overrideAccess: true,
      })

      const sent = await sendLink(trimmed, token, expiryMinutes)
      if (!sent) {
        return Response.json({ error: 'Failed to send verification email.' }, { status: 502 })
      }
      return Response.json({ success: true, message: 'Verification link sent to your email.' })
    }

    // OTP
    const code = generateOTP(getOTPLength())
    const expirySeconds = parsePositiveInt(
      process.env.EMAIL_VERIFICATION_OTP_EXPIRY,
      DEFAULT_OTP_EXPIRY_SECONDS
    )
    expiresAt.setSeconds(expiresAt.getSeconds() + expirySeconds)

    await payload.create({
      collection: 'verification-codes',
      data: {
        identifier: trimmed,
        type: 'email',
        code,
        expiresAt: expiresAt.toISOString(),
        ip,
      },
      req,
      overrideAccess: true,
    })

    const sent = await sendOtpEmail(trimmed, code, expirySeconds)
    if (!sent) {
      return Response.json({ error: 'Failed to send verification code.' }, { status: 502 })
    }
    return Response.json({ success: true, message: 'Verification code sent to your email.' })
}

export const sendVerificationEndpoint: Endpoint = {
  path: '/auth/send-verification',
  method: 'post',
  handler: async (req) => sendVerificationHandler(req),
}
