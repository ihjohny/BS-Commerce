/**
 * Email verification: link strategy.
 * Sends a one-click link; user verifies via GET /api/auth/verify-email/:token.
 */
import { sendEmail } from '../../notifications/lib/send-email'

const DEFAULT_EXPIRY_MINUTES = 30

export async function sendVerificationLink(
  email: string,
  token: string,
  expiryMinutes: number = DEFAULT_EXPIRY_MINUTES
): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERIFICATION_BASE_URL || 'http://localhost:3000'
  const verifyUrl = `${baseUrl.replace(/\/$/, '')}/api/auth/verify-email/${token}`

  const subject = 'Verify your email address'
  const html = `
    <p>Please verify your email by clicking the link below.</p>
    <p><a href="${verifyUrl}">Verify email</a></p>
    <p>This link expires in ${expiryMinutes} minutes. If you didn't request this, you can ignore this email.</p>
  `
  const text = `Verify your email: ${verifyUrl}\n\nThis link expires in ${expiryMinutes} minutes.`

  // Log full link/token only in non-production so testers can copy when email is console-only
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Verification] Full link — copy the token (after the last /) for POST /api/auth/verify-email:', verifyUrl)
    console.log('[Verification] Token only:', token)
  }

  return sendEmail({ to: email, subject, html, text })
}
