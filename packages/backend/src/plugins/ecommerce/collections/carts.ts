import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'

export const Carts: CollectionConfig = {
  slug: 'carts',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'guestId', 'subtotal', 'expiresAt'],
    group: 'Ecommerce',
  },
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        if (!data?.items || !Array.isArray(data.items)) return data

        for (const item of data.items) {
          const variantId = typeof item.variant === 'object' ? item.variant?.id : item.variant
          const productId = typeof item.product === 'object' ? item.product?.id : item.product
          if (variantId && productId) {
            const variant = await req.payload.findByID({
              collection: 'product-variants',
              id: variantId,
            })
            const vProductId = typeof variant?.product === 'object' ? variant?.product?.id : variant?.product
            if (variant && vProductId !== productId) {
              throw new Error(`Variant ${variantId} does not belong to product ${productId}`)
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
      required: true,
      defaultValue: [],
      fields: [
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
        },
        { name: 'quantity', type: 'number', required: true, min: 1 },
        { name: 'unitPrice', type: 'number', required: true, min: 0 },
      ],
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
