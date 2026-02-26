import type { Plugin } from 'payload'
import { Transactions } from './collections/transactions'

export interface PaymentsPluginOptions {
  enabled?: boolean
  adapter?: 'sslcommerz' | 'stripe'
  sslcommerz?: {
    storeId?: string
    storePassword?: string
    sandbox?: boolean
  }
  stripe?: {
    secretKey?: string
    webhookSecret?: string
  }
}

export const paymentsPlugin =
  (options: PaymentsPluginOptions = {}): Plugin =>
  (incomingConfig) => {
    const { enabled = true } = options
    if (!enabled) return incomingConfig

    return {
      ...incomingConfig,
      collections: [
        ...(incomingConfig.collections || []),
        Transactions,
      ],
    }
  }
