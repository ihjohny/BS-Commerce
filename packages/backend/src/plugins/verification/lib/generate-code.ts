import crypto from 'node:crypto'

const EMAIL_LINK_TOKEN_BYTES = 32
const OTP_DIGITS = 6

/**
 * Generate a secure random token for link-based verification (URL-safe, no padding).
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(EMAIL_LINK_TOKEN_BYTES).toString('base64url')
}

/**
 * Generate a numeric OTP of given length (default 6). Not zero-padded for display.
 */
export function generateOTP(length: number = OTP_DIGITS): string {
  const max = 10 ** length - 1
  const n = crypto.randomInt(0, max + 1)
  return n.toString().padStart(length, '0')
}
