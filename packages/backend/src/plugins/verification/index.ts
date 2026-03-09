/**
 * Phase 6.1/6.2 — Identifier verification plugin.
 * Email: link or OTP (EMAIL_VERIFICATION_STRATEGY=link|otp).
 * Phone: OTP via PHONE_VERIFICATION_PROVIDER=twilio|sslwireless|console.
 * See docs/IDENTIFIER-VERIFICATION-BACKLOG.md.
 */
import type { Plugin } from 'payload'
import { VerificationCodes } from './collections/verification-codes'
import { sendVerificationEndpoint } from './endpoints/send-verification'
import { verifyEmailEndpoint } from './endpoints/verify-email'
import { verifyPhoneEndpoint } from './endpoints/verify-phone'

export interface VerificationPluginOptions {
  /** Enable the plugin. Default true. */
  enabled?: boolean
  /** Email strategy: link (one-click URL) or otp (code in email). Default from env EMAIL_VERIFICATION_STRATEGY. */
  emailStrategy?: 'link' | 'otp'
}

export const verificationPlugin =
  (options: VerificationPluginOptions = {}): Plugin =>
  (incomingConfig) => {
    const { enabled = true } = options
    if (!enabled) return incomingConfig

    const collections = [...(incomingConfig.collections || []), VerificationCodes]
    const endpoints = [
      ...(incomingConfig.endpoints || []),
      sendVerificationEndpoint,
      verifyEmailEndpoint,
      verifyPhoneEndpoint,
    ]

    return {
      ...incomingConfig,
      collections,
      endpoints,
    }
  }
