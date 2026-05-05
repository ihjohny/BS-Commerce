import type { PayloadRequest } from 'payload'

import { LOOSE_EMAIL_FORMAT_RE } from '@/lib/validation/email-format'

export const INVALID_LINK_ERROR = 'Invalid or expired verification link.'

interface VerifyEmailTokenParams {
  token: string
  req: PayloadRequest
}

export async function consumeEmailVerificationToken({
  token,
  req,
}: VerifyEmailTokenParams): Promise<{ success: true } | { success: false; error: string }> {
  const trimmedToken = token.trim()
  if (!trimmedToken) {
    return { success: false, error: 'Verification token is required.' }
  }

  const payload = req.payload
  const { docs } = await payload.find({
    collection: 'verification-codes',
    where: {
      type: { equals: 'email' },
      code: { equals: trimmedToken },
      used: { equals: false },
    },
    limit: 1,
    req,
    overrideAccess: true,
  })

  const record = docs[0]
  if (!record) {
    return { success: false, error: INVALID_LINK_ERROR }
  }

  const expiresAt = record.expiresAt ? new Date(record.expiresAt).getTime() : 0
  if (Date.now() > expiresAt) {
    return { success: false, error: INVALID_LINK_ERROR }
  }

  await payload.update({
    collection: 'verification-codes',
    id: record.id,
    data: { used: true, usedAt: new Date().toISOString() },
    req,
    overrideAccess: true,
  })

  const identifier = String(record.identifier || '')
    .trim()
    .toLowerCase()

  if (LOOSE_EMAIL_FORMAT_RE.test(identifier)) {
    const { docs: users } = await payload.find({
      collection: 'users',
      where: { email: { equals: identifier } },
      limit: 1,
      req,
      overrideAccess: true,
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
  }

  return { success: true }
}
