import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'

export const Coupons: CollectionConfig = {
  slug: 'coupons',
  admin: {
    useAsTitle: 'code',
    defaultColumns: ['code', 'type', 'value', 'isActive', 'expiresAt', 'totalUses', 'updatedAt'],
    group: 'Discounts',
    description: 'Cart-level coupons. Validation always runs server-side.',
  },
  access: {
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        if (typeof data.code === 'string') {
          data.code = data.code.trim().toUpperCase()
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'code', type: 'text', required: true, unique: true, index: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'percentage',
      options: [
        { label: 'Percentage', value: 'percentage' },
        { label: 'Fixed', value: 'fixed' },
      ],
    },
    { name: 'value', type: 'number', required: true, min: 0 },
    { name: 'minOrderValue', type: 'number', defaultValue: 0, min: 0 },
    { name: 'expiresAt', type: 'date' },
    { name: 'maxTotalUses', type: 'number', min: 1 },
    { name: 'maxUsesPerUser', type: 'number', min: 1 },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
    {
      name: 'totalUses',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true, description: 'Auto-incremented after successful checkout.' },
    },
  ],
  timestamps: true,
}
