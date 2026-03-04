import type { CollectionConfig } from 'payload'

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

export function createCartsConfig(multivendorEnabled: boolean): CollectionConfig {
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
        }

        const subtotal = data.items.reduce(
          (sum: number, i: { quantity?: number; unitPrice?: number }) =>
            sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
          0
        )
        data.subtotal = Math.round(subtotal * 100) / 100
        return data
      },
    ],
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => {
      if (req.user?.role === 'admin') return true
      if (req.user) return { user: { equals: req.user.id } }
      return false
    },
    update: ({ req }) => {
      if (req.user?.role === 'admin') return true
      if (req.user) return { user: { equals: req.user.id } }
      return false
    },
    delete: ({ req }) => {
      if (req.user?.role === 'admin') return true
      if (req.user) return { user: { equals: req.user.id } }
      return false
    },
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
      admin: { description: 'UUID for guest identification.' },
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
      name: 'expiresAt',
      type: 'date',
      admin: { description: 'Guest carts expire.' },
    },
  ],
  timestamps: true,
  }
}

export const Carts = createCartsConfig(false)
