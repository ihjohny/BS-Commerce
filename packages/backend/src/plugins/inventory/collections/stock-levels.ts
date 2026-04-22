import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { stockLevelTenantCreate, stockLevelTenantRead } from '../../../access/is-admin-or-vendor-stock-tenant'

function relationId(value: unknown): string | null {
  /* c8 ignore next 2 - buildStockLevelTitle guards falsy location before calling relationId */
  if (!value) return null
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object') {
    const id = (value as { id?: unknown }).id
    return id == null ? null : String(id)
  }
  return null
}

async function buildStockLevelTitle(req: any, data: Record<string, unknown>): Promise<string | null> {
  const locationRaw = data.location
  if (!locationRaw) return null

  let locationName: string | null = null
  if (typeof locationRaw === 'object' && locationRaw && 'name' in locationRaw) {
    const maybeName = (locationRaw as { name?: unknown }).name
    if (typeof maybeName === 'string' && maybeName.trim()) {
      locationName = maybeName.trim()
    }
  }

  const locationId = relationId(locationRaw)
  if (!locationName && locationId && req?.payload?.findByID) {
    try {
      const location = await req.payload.findByID({
        collection: 'stock-locations',
        id: locationId,
        depth: 0,
        overrideAccess: true,
        req,
      })
      const name = (location as { name?: unknown } | undefined)?.name
      if (typeof name === 'string' && name.trim()) locationName = name.trim()
    } catch {
      // If lookup fails, we still fall back to ID-based label below.
    }
  }

  const quantity = Number(data.quantity ?? 0)
  const reserved = Number(data.reservedQuantity ?? 0)
  const where = locationName || locationId
  if (!where) return null
  return `${where} | qty:${Number.isFinite(quantity) ? quantity : 0} | res:${Number.isFinite(reserved) ? reserved : 0}`
}

export function createStockLevelsConfig(): CollectionConfig {
  return {
    slug: 'stock-levels',
    admin: {
      useAsTitle: 'title',
      defaultColumns: ['product', 'variant', 'location', 'quantity', 'reservedQuantity'],
      group: 'Inventory',
    },
    access: {
      create: stockLevelTenantCreate,
      read: stockLevelTenantRead,
      update: stockLevelTenantRead,
      delete: stockLevelTenantRead,
    },
    fields: [
      {
        name: 'title',
        type: 'text',
        admin: {
          readOnly: true,
        },
      },
      {
        name: 'product',
        type: 'relationship',
        relationTo: 'products',
        required: true,
      },
      {
        name: 'variant',
        type: 'relationship',
        relationTo: 'product-variants',
        admin: { description: 'Optional. Leave empty for product-level stock (no variants).' },
      },
      {
        name: 'location',
        type: 'relationship',
        relationTo: 'stock-locations',
        required: true,
      },
      { name: 'quantity', type: 'number', required: true, min: 0 },
      { name: 'reservedQuantity', type: 'number', defaultValue: 0, min: 0 },
    ],
    hooks: {
      beforeValidate: [
        async ({ data, originalDoc, req, operation }) => {
          if (process.env.MULTIVENDOR_ENABLED !== 'true') return data
          if (!data) return data
          const merged = { ...(originalDoc || {}), ...data } as Record<string, unknown>
          const productRef = merged.product
          const locationRef = merged.location
          if (!productRef || !locationRef) return data

          const productId = relationId(productRef)
          const locationId = relationId(locationRef)
          if (!productId || !locationId) return data

          try {
            const [product, location] = await Promise.all([
              req.payload.findByID({
                collection: 'products',
                id: productId,
                depth: 0,
                overrideAccess: true,
                req,
              }),
              req.payload.findByID({
                collection: 'stock-locations',
                id: locationId,
                depth: 0,
                overrideAccess: true,
                req,
              }),
            ])

            const prodTenant = relationId((product as Record<string, unknown>)?.tenant)
            const locTenant = relationId((location as Record<string, unknown>)?.tenant)

            if (prodTenant && locTenant && prodTenant !== locTenant) {
              const err = new Error(
                `Cross-vendor stock forbidden: product tenant (${prodTenant}) does not match location tenant (${locTenant}).`,
              )
              ;(err as any).status = 400
              throw err
            }
          } catch (e: any) {
            if (e?.status === 400) throw e
          }

          return data
        },
      ],
      beforeChange: [
        async ({ data, originalDoc, req }) => {
          if (!data) return data
          const merged = { ...(originalDoc || {}), ...data } as Record<string, unknown>
          const title = await buildStockLevelTitle(req, merged)
          if (title) {
            ;(data as Record<string, unknown>).title = title
          }
          return data
        },
      ],
      afterRead: [
        async ({ doc, req }) => {
          if (!doc) return doc
          if ((doc as { title?: unknown }).title) return doc

          // Relation option lists may return sparse docs (id/title only). Hydrate by id when needed.
          let source = doc as Record<string, unknown>
          if (!source.location && source.id && req?.payload?.findByID) {
            try {
              const hydrated = await req.payload.findByID({
                collection: 'stock-levels',
                id: String(source.id),
                depth: 1,
                overrideAccess: true,
                req,
              })
              if (hydrated && typeof hydrated === 'object') {
                source = hydrated as Record<string, unknown>
              }
            } catch {
              // Best-effort only; leave as-is if hydration fails.
            }
          }

          const title = await buildStockLevelTitle(req, source)
          if (title) (doc as Record<string, unknown>).title = title
          return doc
        },
      ],
    },
    timestamps: true,
  }
}

/** @deprecated use createStockLevelsConfig */
export const StockLevels = createStockLevelsConfig()
