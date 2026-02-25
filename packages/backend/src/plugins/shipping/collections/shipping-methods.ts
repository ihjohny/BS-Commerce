import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { getCurrencyOptions } from '../../../lib/currencies'

export const ShippingMethods: CollectionConfig = {
  slug: 'shipping-methods',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'zone', 'type', 'rate', 'currency'],
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
      name: 'zone',
      type: 'relationship',
      relationTo: 'shipping-zones',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Flat Rate', value: 'flat' },
        { label: 'Per Item', value: 'per-item' },
        { label: 'Weight Based', value: 'weight-based' },
      ],
    },
    { name: 'rate', type: 'number', required: true, min: 0 },
    {
      name: 'currency',
      type: 'select',
      required: true,
      defaultValue: 'USD',
      options: getCurrencyOptions(),
    },
    { name: 'minOrderValue', type: 'number', min: 0 },
    { name: 'maxOrderValue', type: 'number', min: 0 },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ],
  timestamps: true,
}
