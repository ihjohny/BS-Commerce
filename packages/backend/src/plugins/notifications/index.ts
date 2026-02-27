import type { Plugin } from 'payload'

export interface NotificationsPluginOptions {
  enabled?: boolean
  adapters?: {
    email?: 'smtp' | 'resend'
    sms?: string
  }
}

/**
 * Basic notifications plugin.
 * Phase 3: Sends order confirmation email on order creation.
 * Uses console logging if no SMTP configured.
 */
export const notificationsPlugin =
  (options: NotificationsPluginOptions = {}): Plugin =>
  (incomingConfig) => {
    const { enabled = true } = options
    if (!enabled) return incomingConfig

    // Phase 3: no new collections. Hooks are registered via orders plugin.
    // The sendOrderConfirmation is called from process-checkout.
    return incomingConfig
  }
