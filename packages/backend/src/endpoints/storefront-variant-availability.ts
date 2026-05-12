/**
 * GET /api/storefront/variant-availability?product={id}&store={stockLocationId?}
 *
 * Public read model for PDP: which variant lines can be allocated at least one unit
 * using the same rules as checkout (`allocateStockLevelForLine`).
 *
 * Gated by `STOREFRONT_VARIANT_AVAILABILITY_ENDPOINT_ENABLED`. Response includes `inventoryEnabled`
 * reflecting `INVENTORY_ENABLED` (when disabled, all lines are `purchasable: true` without allocation work).
 */
import type { Endpoint } from 'payload'
import { allocateStockLevelForLine } from '../lib/allocate-stock-level'
import {
  isInventoryEnabled,
  isStorefrontVariantAvailabilityEndpointEnabled,
} from '../lib/inventory-policy'

export const storefrontVariantAvailabilityEndpoint: Endpoint = {
  path: '/storefront/variant-availability',
  method: 'get',
  handler: async (req) => {
    if (!isStorefrontVariantAvailabilityEndpointEnabled()) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const url = new URL(req.url ?? '', 'http://localhost')
    const productId = url.searchParams.get('product')?.trim()
    const storeId = url.searchParams.get('store')?.trim() || undefined

    if (!productId) {
      return Response.json({ error: 'product query parameter is required' }, { status: 400 })
    }

    try {
      const product = await req.payload.findByID({
        collection: 'products',
        id: productId,
        depth: 0,
        overrideAccess: true,
      })

      if (!product || (product as { status?: string }).status !== 'published') {
        return Response.json({ error: 'Product not found' }, { status: 404 })
      }

      const multivendor = process.env.MULTIVENDOR_ENABLED === 'true'
      const tenantRaw = (product as { tenant?: { id: string } | string | null }).tenant
      let tenantId: string | null = null
      if (multivendor && tenantRaw != null) {
        tenantId = typeof tenantRaw === 'object' ? tenantRaw?.id ?? null : String(tenantRaw)
      }

      const { docs: variantDocs } = await req.payload.find({
        collection: 'product-variants',
        where: {
          and: [{ product: { equals: productId } }, { isActive: { equals: true } }],
        },
        limit: 200,
        depth: 0,
        overrideAccess: true,
      })

      if (!isInventoryEnabled()) {
        return Response.json({
          inventoryEnabled: false,
          productId,
          storeLocationId: storeId ?? null,
          lines: variantDocs.map((v) => ({
            variantId: String(v.id),
            purchasable: true,
          })),
        })
      }

      const lines: Array<{ variantId: string | null; purchasable: boolean }> = []

      for (const v of variantDocs) {
        const vid = String(v.id)
        const r = await allocateStockLevelForLine(
          req.payload,
          {
            productId,
            variantId: vid,
            quantity: 1,
            tenantId,
            storeLocationId: storeId ?? null,
          },
          req,
        )
        lines.push({ variantId: vid, purchasable: !('error' in r) })
      }

      if (variantDocs.length === 0) {
        const r = await allocateStockLevelForLine(
          req.payload,
          {
            productId,
            variantId: null,
            quantity: 1,
            tenantId,
            storeLocationId: storeId ?? null,
          },
          req,
        )
        lines.push({ variantId: null, purchasable: !('error' in r) })
      }

      return Response.json({
        inventoryEnabled: true,
        productId,
        storeLocationId: storeId ?? null,
        lines,
      })
    } catch (err) {
      console.error('[storefront/variant-availability]', err)
      return Response.json({ error: 'Failed to resolve availability' }, { status: 500 })
    }
  },
}
