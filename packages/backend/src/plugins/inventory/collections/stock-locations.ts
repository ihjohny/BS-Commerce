import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'

export const StockLocations: CollectionConfig = {
  slug: 'stock-locations',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'code', 'isActive'],
    group: 'Inventory',
  },
  access: {
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'code', type: 'text', required: true, unique: true },
    {
      name: 'address',
      type: 'group',
      fields: [
        { name: 'street', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'state', type: 'text' },
        { name: 'country', type: 'text' },
        { name: 'postalCode', type: 'text' },
      ],
    },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ],
  timestamps: true,
}
