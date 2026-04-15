import type { Plugin } from 'payload'
import { GeoCountries } from './collections/geo-countries'
import { GeoSubdivisions } from './collections/geo-subdivisions'
import { GeoLocalities } from './collections/geo-localities'
import { StockLocationServiceAreas } from './collections/stock-location-service-areas'

export interface GeographyPluginOptions {
  enabled?: boolean
}

/**
 * Hierarchical geography: country → subdivision → locality (global-neutral names).
 * Junction `stock-location-service-areas` links stock locations to served areas.
 * Disabled until GEOGRAPHY_ENABLED=true.
 */
export const geographyPlugin =
  (options: GeographyPluginOptions = {}): Plugin =>
  (incomingConfig) => {
    const { enabled = false } = options
    if (!enabled) return incomingConfig

    return {
      ...incomingConfig,
      collections: [
        ...(incomingConfig.collections || []),
        GeoCountries,
        GeoSubdivisions,
        GeoLocalities,
        StockLocationServiceAreas,
      ],
    }
  }
