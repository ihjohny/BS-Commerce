/**
 * Phase 6.2 — Phone verification adapter interface.
 * Verify is stateless: compare stored code + expiry in the endpoint.
 */
export interface PhoneVerificationAdapter {
  sendOTP(phone: string, code: string, expirySeconds: number): Promise<boolean>
}
