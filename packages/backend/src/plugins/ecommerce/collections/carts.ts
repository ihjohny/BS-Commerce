import { APIError, type CollectionConfig, type Where } from 'payload'
import { allocateStockLevelForLine } from '../../../lib/allocate-stock-level'
import {
  shouldValidateCartWarehouseAllocation,
  isInventoryEnabled,
  isSingleStoreCartEnabled,
} from '../../../lib/inventory-policy'
import { validateCouponForSubtotal } from '../../discounts/lib/coupon'
import { isValidUUID } from '../../../lib/utils'

const itemFieldsBase = [
  {
    name: 'product',
    type: 'relationship' as const,
    relationTo: 'products',
    required: true,
  },
  {
    name: 'variant',
    type: 'relationship' as const,
    relationTo: 'product-variants',
  },
  { name: 'quantity', type: 'number' as const, required: true, min: 1 },
  {
    name: 'unitPrice',
    type: 'number' as const,
    required: false,
    min: 0,
    admin: { description: 'Auto-set from product basePrice or variant price. Do not send.' },
  },
]

export function createCartsConfig(multivendorEnabled: boolean, allowGuestCheckout = false): CollectionConfig {
  const itemFields = [
    ...itemFieldsBase.slice(0, 2),
    ...(multivendorEnabled
      ? [
          {
            name: 'vendor',
            type: 'relationship' as const,
            relationTo: 'tenants' as const,
            admin: { description: 'Denormalized vendor for cart grouping. Auto-set from product.' },
          },
        ]
      : []),
    ...itemFieldsBase.slice(2),
  ]

  // ── Guest-aware access helpers ────────────────────────────────────────────
  // When allowGuestCheckout is true, unauthenticated requests with a valid
  // X-Guest-Id header can access carts matching their guestId (and only
  // carts without a user — prevents accessing authenticated users' carts).

  function guestReadFilter(req: {
    user?: { id: string | number; role?: string } | null
    headers: { get(name: string): string | null }
  }): boolean | Where {
    if (req.user?.role === 'admin') return true
    if (req.user) return { user: { equals: req.user.id } } as Where
    if (!allowGuestCheckout) return false

    const guestId = req.headers.get('x-guest-id')
    if (!guestId || !isValidUUID(guestId)) return false
    return {
      and: [
        { guestId: { equals: guestId } },
        { user: { equals: null } },
      ],
    } as Where
  }

  return {
  slug: 'carts',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'guestId', 'subtotal', 'expiresAt'],
    group: 'Ecommerce',
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        if (!data) return data

        if (typeof data.customerNote === 'string') {
          const trimmed = data.customerNote.replace(/\0/g, '').trim().slice(0, 2000)
          data.customerNote = trimmed.length > 0 ? trimmed : null
        }

        // ── Guest cart: assign guestId from header, never from body ────────
        if (!req.user) {
          if (operation === 'create') {
            const headerGuestId = req.headers.get('x-guest-id')
            if (!headerGuestId || !isValidUUID(headerGuestId)) {
              throw new APIError('X-Guest-Id header with a valid UUID is required for guest cart creation', 400)
            }
            data.guestId = headerGuestId
            data.user = undefined // Guest carts never have a user
            // Default expiry: 7 days from now
            if (!data.expiresAt) {
              data.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }
          }
          // On update: do not modify guestId — it was set on create
        }

        // User assignment: customers can only create/update for self; admin can set any user.
        if (req.user?.id != null) {
          if (req.user.role !== 'admin') {
            data.user = req.user.id // Customer/vendor: always use own ID, ignore any passed value
          } else if (operation === 'create' && data.user == null) {
            data.user = req.user.id // Admin create: default to self when not specified
          }
          // Admin update: allow explicit user (or leave unchanged if not in payload)
        }

        if (!data.items || !Array.isArray(data.items)) return data

        const validateWarehouseOnCart = shouldValidateCartWarehouseAllocation()
        const warehouseStockLines: Array<{
          productId: string
          variantId: string | null
          tenantId: string | null
          quantity: number
        }> = []

        // Derive unitPrice and vendor from product/variant — never trust client (OWASP: price manipulation)
        for (const item of data.items) {
          const variantId = typeof item.variant === 'object' ? item.variant?.id : item.variant
          const productId = typeof item.product === 'object' ? item.product?.id : item.product
          if (!productId) continue

          const product = await req.payload.findByID({
            collection: 'products',
            id: productId,
            depth: 1,
          })
          if (!product) throw new Error(`Product ${productId} not found`)

          let unitPrice: number
          if (variantId) {
            const variant = await req.payload.findByID({
              collection: 'product-variants',
              id: variantId,
              depth: 0,
            })
            const vProductId = typeof variant?.product === 'object' ? variant?.product?.id : variant?.product
            if (!variant || vProductId !== productId) {
              throw new Error(`Variant ${variantId} does not belong to product ${productId}`)
            }
            unitPrice = Number((variant as { price?: number }).price)
            if (isNaN(unitPrice) || unitPrice < 0) throw new Error(`Invalid variant price for ${variantId}`)
          } else {
            unitPrice = Number((product as { basePrice?: number }).basePrice)
            if (isNaN(unitPrice) || unitPrice < 0) throw new Error(`Invalid product basePrice for ${productId}`)
          }
          item.unitPrice = Math.round(unitPrice * 100) / 100
          // Denormalize vendor (tenant) for multivendor cart grouping
          if (process.env.MULTIVENDOR_ENABLED === 'true') {
            const tenant = (product as { tenant?: { id: string } | string | null }).tenant
            if (tenant != null) {
              item.vendor = typeof tenant === 'object' ? tenant?.id : tenant
            }
          }

          if (validateWarehouseOnCart) {
            const multivendor = process.env.MULTIVENDOR_ENABLED === 'true'
            const tenantRaw = (product as { tenant?: { id: string } | string | null }).tenant
            let tenantId: string | null = null
            if (multivendor && tenantRaw != null) {
              tenantId = typeof tenantRaw === 'object' ? tenantRaw?.id ?? null : String(tenantRaw)
            }
            warehouseStockLines.push({
              productId: String(productId),
              variantId: variantId ? String(variantId) : null,
              tenantId,
              quantity: Number(item.quantity) || 1,
            })
          }
        }

        const inventoryEnabled = isInventoryEnabled()
        const singleStoreEnabled = isSingleStoreCartEnabled()
        const storeId = typeof data.store === 'object' ? (data.store as { id: string })?.id : data.store

        if (validateWarehouseOnCart) {
          const storeLocationId = storeId ?? undefined
          for (const line of warehouseStockLines) {
            const alloc = await allocateStockLevelForLine(
              req.payload,
              {
                productId: line.productId,
                variantId: line.variantId,
                quantity: line.quantity,
                tenantId: line.tenantId,
                storeLocationId: storeLocationId ?? null,
              },
              req,
            )
            if ('error' in alloc) {
              throw new APIError(alloc.error, 400)
            }
          }
        }

        // ── Single-store cart enforcement (legacy path when warehouse cart validation is off) ──
        if (!validateWarehouseOnCart && singleStoreEnabled && inventoryEnabled && storeId) {
          for (const item of data.items) {
            const pId = typeof item.product === 'object' ? item.product?.id : item.product
            const vId = item.variant ? (typeof item.variant === 'object' ? item.variant?.id : item.variant) : null
            if (!pId) continue

            const baseAnd: Array<Record<string, unknown>> = [
              { location: { equals: storeId } },
              { product: { equals: pId } },
            ]

            const fetchStockDoc = async (extra: Record<string, unknown> | null) => {
              const and = extra ? [...baseAnd, extra] : [...baseAnd]
              const { docs } = await req.payload.find({
                collection: 'stock-levels',
                where: { and } as Where,
                limit: 1,
                depth: 0,
                overrideAccess: true,
              })
              return docs[0] as { quantity?: number; reservedQuantity?: number } | undefined
            }

            /** Prefer variant-specific rows; fall back to product-level stock (variant unset/null per inventory docs). */
            let stockRow: { quantity?: number; reservedQuantity?: number } | undefined
            if (vId) {
              stockRow = await fetchStockDoc({ variant: { equals: vId } })
              if (!stockRow) {
                stockRow = await fetchStockDoc({ variant: { equals: null } })
              }
            } else {
              stockRow = await fetchStockDoc({ variant: { equals: null } })
              if (!stockRow) {
                stockRow = await fetchStockDoc(null)
              }
            }

            if (!stockRow) {
              const productName = typeof item.product === 'object' ? (item.product as { name?: string }).name || pId : pId
              throw new APIError(`Product "${productName}" is not available at the selected store`, 400)
            }

            const sl = stockRow
            const available = (Number(sl.quantity) || 0) - (Number(sl.reservedQuantity) || 0)
            const qty = Number(item.quantity) || 1
            if (available < qty) {
              const productName = typeof item.product === 'object' ? (item.product as { name?: string }).name || pId : pId
              throw new APIError(`Insufficient stock for "${productName}" at the selected store (available: ${available})`, 400)
            }
          }
        }

        const subtotal = data.items.reduce(
          (sum: number, i: { quantity?: number; unitPrice?: number }) =>
            sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
          0
        )
        data.subtotal = Math.round(subtotal * 100) / 100
        data.discountTotal = 0
        data.appliedCoupon = null

        if (typeof data.couponCode === 'string' && data.couponCode.trim()) {
          const couponResult = await validateCouponForSubtotal({
            payload: req.payload,
            req,
            couponCode: data.couponCode,
            subtotal: data.subtotal,
            userId: req.user?.id,
          })
          if (!couponResult.valid) {
            throw new APIError(couponResult.discountReason, 400)
          }
          data.couponCode = couponResult.coupon.code
          data.appliedCoupon = couponResult.coupon.id
          data.discountTotal = couponResult.discountTotal
        }

        data.grandTotal = Math.round((Number(data.subtotal || 0) - Number(data.discountTotal || 0)) * 100) / 100
        return data
      },
    ],
  },
  access: {
    create: ({ req }) => {
      if (req.user) return true
      if (!allowGuestCheckout) return false
      const guestId = req.headers.get('x-guest-id')
      return Boolean(guestId && isValidUUID(guestId))
    },
    read: ({ req }) => guestReadFilter(req),
    update: ({ req }) => guestReadFilter(req),
    delete: ({ req }) => guestReadFilter(req),
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: { description: 'Null for guest carts.' },
    },
    {
      name: 'guestId',
      type: 'text',
      index: true,
      admin: { description: 'UUID for guest identification. Set from X-Guest-Id header; never from body.' },
    },
    {
      name: 'items',
      type: 'array',
      required: false, // Allow empty cart after checkout; required=true would reject []
      defaultValue: [],
      fields: itemFields,
    },
    {
      name: 'subtotal',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true, description: 'Auto-calculated from items.' },
    },
    {
      name: 'couponCode',
      type: 'text',
      admin: { description: 'Optional coupon code. Validated server-side.' },
    },
    {
      name: 'appliedCoupon',
      type: 'relationship',
      relationTo: 'coupons',
      admin: { readOnly: true, description: 'Resolved coupon from couponCode.' },
    },
    {
      name: 'discountTotal',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true, description: 'Discount amount from applied coupon.' },
    },
    {
      name: 'grandTotal',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true, description: 'subtotal - discountTotal (shipping/tax excluded in cart).' },
    },
    {
      name: 'store',
      type: 'relationship',
      relationTo: 'stock-locations',
      admin: {
        description: 'Selected store/outlet for this shopping session. Set by storefront when customer picks a store.',
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      admin: { description: 'Guest carts expire. Auto-set to 7 days on guest create.' },
    },
    {
      name: 'customerNote',
      type: 'textarea',
      maxLength: 2000,
      admin: {
        description:
          'Optional message for the seller / fulfillment team. Copied to the order at checkout.',
      },
    },
  ],
  timestamps: true,
  }
}

export const Carts = createCartsConfig(false)
