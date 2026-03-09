/**
 * Phase 6.2 — Twilio SMS adapter for phone verification.
 * Sends OTP via Twilio REST API. Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.
 */
import type { PhoneVerificationAdapter } from './phone-types'

function getTwilioConfig(): { accountSid: string; authToken: string; fromNumber: string } | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID
  if (!accountSid || !authToken || !fromNumber) return null
  return { accountSid, authToken, fromNumber }
}

export const phoneTwilioAdapter: PhoneVerificationAdapter = {
  async sendOTP(phone: string, code: string, expirySeconds: number): Promise<boolean> {
    const config = getTwilioConfig()
    if (!config) {
      console.warn('[Verification] Twilio not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER). Logging OTP.')
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Verification] Phone OTP:', { phone, code, expirySeconds })
      }
      return true
    }

    const body = new URLSearchParams({
      To: phone.startsWith('+') ? phone : `+${phone}`,
      From: config.fromNumber,
      Body: `Your verification code is: ${code}. It expires in ${Math.ceil(expirySeconds / 60)} minutes.`,
    })
    const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })
      if (!res.ok) {
        const err = await res.text()
        console.error('[Verification] Twilio error:', res.status, err)
        return false
      }
      return true
    } catch (err) {
      console.error('[Verification] Twilio request failed:', err)
      return false
    }
  },
}
