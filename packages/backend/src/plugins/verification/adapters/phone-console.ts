/**
 * Phase 6.2 — Console-only phone adapter (no SMS sent).
 * Logs OTP to console when NODE_ENV !== 'production' for testing.
 */
import type { PhoneVerificationAdapter } from './phone-types'

export const phoneConsoleAdapter: PhoneVerificationAdapter = {
  async sendOTP(phone: string, code: string, expirySeconds: number): Promise<boolean> {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Verification] Phone OTP (console only):', { phone, code, expirySeconds })
    }
    return true
  },
}
