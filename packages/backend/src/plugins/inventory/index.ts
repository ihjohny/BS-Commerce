import type { Plugin } from 'payload'
import { StockLocations } from './collections/stock-locations'
import { StockLevels } from './collections/stock-levels'

export interface InventoryPluginOptions {
  enabled?: boolean
  trackMovements?: boolean
  lowStockThreshold?: number
}

export const inventoryPlugin =
  (options: InventoryPluginOptions = {}): Plugin =>
  (incomingConfig) => {
    const { enabled = true } = options
    if (!enabled) return incomingConfig

    return {
      ...incomingConfig,
      collections: [
        ...(incomingConfig.collections || []),
        StockLocations,
        StockLevels,
      ],
    }
  }
