import type { Plugin } from 'payload'
import { createOrdersConfig } from './collections/orders'
import { createOrderItemsConfig } from './collections/order-items'
import { OrderStatusHistory } from './collections/order-status-history'
import { SubOrders } from './collections/sub-orders'

export interface OrdersPluginOptions {
  enabled?: boolean
  /** Phase 5: when true, create sub-orders per vendor. Requires MULTIVENDOR_ENABLED. */
  splitByVendor?: boolean
  orderStateMachine?: string
}

export const ordersPlugin =
  (options: OrdersPluginOptions = {}): Plugin =>
  (incomingConfig) => {
    const { enabled = true, splitByVendor = false } = options
    if (!enabled) return incomingConfig

    const collections = [
      ...(incomingConfig.collections || []),
      createOrderItemsConfig(splitByVendor),
      OrderStatusHistory,
      createOrdersConfig(splitByVendor),
    ]
    if (splitByVendor) {
      collections.push(SubOrders)
    }

    return {
      ...incomingConfig,
      collections,
    }
  }
