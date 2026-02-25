import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'

export const StockLevels: CollectionConfig = {
  slug: 'stock-levels',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['product', 'variant', 'location', 'quantity', 'reservedQuantity'],
    group: 'Inventory',
  },
  access: {
    create: isAdmin,
    read: isAdmin,
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
  timestamps: true,
}
