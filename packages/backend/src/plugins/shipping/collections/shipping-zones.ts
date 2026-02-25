import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'

export const ShippingZones: CollectionConfig = {
  slug: 'shipping-zones',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'countries', 'isActive'],
    group: 'Shipping',
  },
  access: {
    create: isAdmin,
    read: () => true,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'countries',
      type: 'array',
      fields: [{ name: 'code', type: 'text', required: true }],
      admin: { description: 'ISO country codes (e.g. BD, US). Empty = rest of world.' },
    },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ],
  timestamps: true,
}
