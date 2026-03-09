/**
 * Phase 6.1 — Identifier verification plugin.
 * Email: link or OTP strategy (EMAIL_VERIFICATION_STRATEGY=link|otp).
 * Phone: Phase 6.2 (adapters and endpoints TBD).
 * See docs/IDENTIFIER-VERIFICATION-BACKLOG.md.
 */
import type { Plugin } from 'payload'
import { VerificationCodes } from './collections/verification-codes'
import { sendVerificationEndpoint } from './endpoints/send-verification'
import { verifyEmailEndpoint } from './endpoints/verify-email'

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
    ]

    return {
      ...incomingConfig,
      collections,
      endpoints,
    }
  }
