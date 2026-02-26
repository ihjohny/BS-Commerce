import type { Plugin } from 'payload'
import { Orders } from './collections/orders'
import { OrderItems } from './collections/order-items'
import { OrderStatusHistory } from './collections/order-status-history'

export interface OrdersPluginOptions {
  enabled?: boolean
  splitByVendor?: boolean // Phase 5: sub-orders. Phase 3: false
  orderStateMachine?: string
}

export const ordersPlugin =
  (options: OrdersPluginOptions = {}): Plugin =>
  (incomingConfig) => {
    const { enabled = true } = options
    if (!enabled) return incomingConfig

    return {
      ...incomingConfig,
      collections: [
        ...(incomingConfig.collections || []),
        OrderItems,
        OrderStatusHistory,
        Orders,
      ],
    }
  }
