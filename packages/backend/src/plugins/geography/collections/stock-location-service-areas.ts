import type { CollectionConfig } from 'payload'
import {
  stockLocationServiceAreaCreate,
  stockLocationServiceAreaRead,
  stockLocationServiceAreaUpdateDelete,
} from '../access'

function relationId(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return String((value as { id: unknown }).id)
  }
  return null
}

export const StockLocationServiceAreas: CollectionConfig = {
  slug: 'stock-location-service-areas',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['stockLocation', 'subdivision', 'locality', 'sortOrder'],
    group: 'Geography',
    description:
      'Maps a stock location to geographic areas it serves. Subdivision is denormalized for fast queries. Leave locality empty to cover the entire subdivision.',
  },
  access: {
    read: stockLocationServiceAreaRead,
    create: stockLocationServiceAreaCreate,
    update: stockLocationServiceAreaUpdateDelete,
    delete: stockLocationServiceAreaUpdateDelete,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req }) => {
        if (!data) return data
        const localityId = relationId(data.locality)
        let subdivisionId = relationId(data.subdivision)

        if (localityId && req.payload) {
          const loc = await req.payload.findByID({
            collection: 'geo-localities',
            id: localityId,
            depth: 0,
            overrideAccess: true,
          })
          const s = relationId((loc as { subdivision?: unknown })?.subdivision)
          if (s) {
            subdivisionId = s
            data.subdivision = s
          }
        }

        if (!subdivisionId) {
          throw new Error('subdivision is required (set explicitly or via locality).')
        }

        return data
      },
    ],
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        if (!req.user || req.user.role === 'admin') return data
        if (req.user.role !== 'vendor' || !req.user.tenant) return data

        const stockRef =
          data?.stockLocation ?? (originalDoc as { stockLocation?: unknown })?.stockLocation
        const stockId = relationId(stockRef)
        if (!stockId || !req.payload) return data

        const loc = await req.payload.findByID({
          collection: 'stock-locations',
          id: stockId,
          depth: 0,
          overrideAccess: true,
        })
        const vendorTid =
          typeof req.user.tenant === 'object'
            ? relationId(req.user.tenant)
            : String(req.user.tenant)
        const locTenant = relationId((loc as { tenant?: unknown })?.tenant)
        if (locTenant !== vendorTid) {
          throw new Error('You can only define service areas for your own stock locations.')
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'stockLocation',
      type: 'relationship',
      relationTo: 'stock-locations',
      required: true,
      index: true,
    },
    {
      name: 'subdivision',
      type: 'relationship',
      relationTo: 'geo-subdivisions',
      required: true,
      index: true,
      admin: {
        description:
          'Auto-filled from locality when a locality is selected. Must match the locality’s subdivision.',
      },
    },
    {
      name: 'locality',
      type: 'relationship',
      relationTo: 'geo-localities',
      required: false,
      index: true,
      admin: {
        description:
          'Optional. Empty = this row covers the whole subdivision. Set to restrict to one locality.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      admin: { description: 'Lower numbers list first within the same area.' },
    },
  ],
  timestamps: true,
}
