import { APIError, type CollectionConfig, type Where } from 'payload'
import { isOwnerOrAdmin } from '../../../access/is-owner-or-admin'

function relationId(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string' || typeof value === 'number') {
    const t = String(value).trim()
    return t.length > 0 ? t : null
  }
  if (typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (id == null) return null
    const t = String(id).trim()
    return t.length > 0 ? t : null
  }
  return null
}

export const WishlistItems: CollectionConfig = {
  slug: 'wishlist-items',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'product', 'createdAt'],
    group: 'Ecommerce',
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: isOwnerOrAdmin(),
    update: isOwnerOrAdmin(),
    delete: isOwnerOrAdmin(),
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation, req }) => {
        if (!data) return data
        if (req.user?.role !== 'admin' && req.user?.id != null) {
          data.user = req.user.id
        }

        const userId = relationId(data.user ?? originalDoc?.user)
        const productId = relationId(data.product ?? originalDoc?.product)
        if (!userId || !productId) return data

        const selfId = operation === 'update' ? relationId(originalDoc?.id) : null
        const where: Where = {
          and: [
            { user: { equals: userId } },
            { product: { equals: productId } },
            ...(selfId ? [{ id: { not_equals: selfId } }] : []),
          ],
        }

        const existing = await req.payload.find({
          collection: 'wishlist-items',
          where,
          depth: 0,
          limit: 1,
          overrideAccess: true,
        })
        if ((existing.docs?.length || 0) > 0) {
          throw new APIError('This product is already in your wishlist.', 400)
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
    },
  ],
  timestamps: true,
}
