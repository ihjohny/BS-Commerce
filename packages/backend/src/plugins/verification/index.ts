/**
 * Phase 6.1/6.2 — Identifier verification plugin.
 * Email: link or OTP (EMAIL_VERIFICATION_STRATEGY=link|otp).
 * Phone: OTP via PHONE_VERIFICATION_PROVIDER=twilio|sslwireless|console.
 * See docs/IDENTIFIER-VERIFICATION-BACKLOG.md.
 */
import type { Plugin } from 'payload'
import { VerificationCodes } from './collections/verification-codes'
import { sendVerificationEndpoint } from './endpoints/send-verification'
import { verifyEmailPostEndpoint } from './endpoints/verify-email-post'
import { verifyPhoneEndpoint } from './endpoints/verify-phone'
import { verifyEmailLinkGetEndpoint } from './endpoints/verify-email-link-get'
import { verifyIdentifierAdminEndpoint } from './endpoints/verify-identifier-admin'

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

    const existingCollections = incomingConfig.collections || []
    const hasVerificationCodes = existingCollections.some((c) => c?.slug === VerificationCodes.slug)
    const collections = hasVerificationCodes
      ? existingCollections
      : [...existingCollections, VerificationCodes]

    const pluginEndpoints = [
      sendVerificationEndpoint,
      verifyEmailPostEndpoint,
      verifyPhoneEndpoint,
      verifyEmailLinkGetEndpoint,
      verifyIdentifierAdminEndpoint,
    ]
    const existingEndpoints = incomingConfig.endpoints || []
    const existingEndpointPaths = new Set(existingEndpoints.map((e) => e?.path))
    const dedupedPluginEndpoints = pluginEndpoints.filter((e) => !existingEndpointPaths.has(e.path))
    const endpoints = [...existingEndpoints, ...dedupedPluginEndpoints]

    return {
      ...incomingConfig,
      collections,
      endpoints,
    }
  }
