import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'

export const ProductVariants: CollectionConfig = {
  slug: 'product-variants',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'sku', 'price', 'product', 'isActive'],
    group: 'Ecommerce',
  },
  access: {
    create: isAdmin,
    read: ({ req }) => {
      if (!req.user) return { isActive: { equals: true } }
      if (req.user.role === 'admin') return true
      return { isActive: { equals: true } }
    },
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
    },
    { name: 'name', type: 'text', required: true },
    { name: 'sku', type: 'text', unique: true, admin: { description: 'Unique per variant. Leave empty for auto-generated.' } },
    { name: 'price', type: 'number', required: true, min: 0 },
    { name: 'compareAtPrice', type: 'number', min: 0 },
    {
      name: 'options',
      type: 'array',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'value', type: 'text', required: true },
      ],
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    { name: 'weight', type: 'number', min: 0 },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ],
  timestamps: true,
}
