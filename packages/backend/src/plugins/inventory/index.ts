import type { Plugin } from 'payload'
import { createStockLocationsConfig } from './collections/stock-locations'
import { createStockLevelsConfig } from './collections/stock-levels'

export interface InventoryPluginOptions {
  enabled?: boolean
  /** When true, stock-locations includes tenant (requires multivendor plugin). */
  multivendorEnabled?: boolean
  trackMovements?: boolean
  lowStockThreshold?: number
}

export const inventoryPlugin =
  (options: InventoryPluginOptions = {}): Plugin =>
  (incomingConfig) => {
    const { enabled = true, multivendorEnabled = false } = options
    if (!enabled) return incomingConfig

    const StockLocations = createStockLocationsConfig(multivendorEnabled)
    const StockLevels = createStockLevelsConfig()

    return {
      ...incomingConfig,
      collections: [...(incomingConfig.collections || []), StockLocations, StockLevels],
    }
  }
