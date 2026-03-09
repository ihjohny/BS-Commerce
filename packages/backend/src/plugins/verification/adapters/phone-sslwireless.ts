/**
 * Phase 6.2 — SSL Wireless SMS adapter (Bangladesh).
 * Stub: logs OTP when credentials not set. Replace with real API when SSL Wireless credentials are available.
 * See: https://developer.sslwireless.com/
 */
import type { PhoneVerificationAdapter } from './phone-types'

export const phoneSSLWirelessAdapter: PhoneVerificationAdapter = {
  async sendOTP(phone: string, code: string, expirySeconds: number): Promise<boolean> {
    const apiKey = process.env.SSLWIRELESS_API_KEY
    const sender = process.env.SSLWIRELESS_SENDER
    if (!apiKey || !sender) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Verification] SSL Wireless not configured. Phone OTP (console):', { phone, code, expirySeconds })
      }
      return true
    }
    // TODO: Integrate SSL Wireless SMS API when endpoint/docs are available
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Verification] SSL Wireless stub — OTP:', { phone, code, expirySeconds })
    }
    return true
  },
}
