/**
 * Email verification: OTP strategy.
 * Sends a numeric code; user verifies via POST /api/auth/verify-email with code + email.
 */
import { sendEmail } from '../../notifications/lib/send-email'

export async function sendVerificationOTP(
  email: string,
  code: string,
  expirySeconds: number
): Promise<boolean> {
  const subject = 'Your verification code'
  const html = `
    <p>Your verification code is: <strong>${code}</strong></p>
    <p>It expires in ${Math.ceil(expirySeconds / 60)} minutes. Do not share this code.</p>
  `
  const text = `Your verification code is: ${code}. It expires in ${Math.ceil(expirySeconds / 60)} minutes.`

  return sendEmail({ to: email, subject, html, text })
}
