import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'

/**
 * Commission Rules — platform fee configuration.
 * Supports percentage, flat, tiered, category-based strategies.
 */
export const CommissionRules: CollectionConfig = {
  slug: 'commission-rules',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'rate', 'priority', 'isActive'],
    group: 'Commissions',
    description: 'Platform commission rules. Higher priority wins when multiple rules apply.',
  },
  access: {
    create: isAdmin,
    read: ({ req }) => Boolean(req.user),
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', type: 'text', required: true, admin: { description: 'Human-readable rule name.' } },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Percentage', value: 'percentage' },
        { label: 'Flat', value: 'flat' },
        { label: 'Tiered', value: 'tiered' },
        { label: 'Category-based', value: 'category-based' },
      ],
    },
    {
      name: 'rate',
      type: 'number',
      min: 0,
      admin: { description: 'For percentage: rate %. For flat: fixed amount.' },
    },
    {
      name: 'tiers',
      type: 'array',
      admin: { description: 'For tiered: minAmount, maxAmount, rate.' },
      fields: [
        { name: 'minAmount', type: 'number', required: true },
        { name: 'maxAmount', type: 'number' },
        { name: 'rate', type: 'number', required: true },
      ],
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: { description: 'For category-based: applies to these categories.' },
    },
    {
      name: 'categoryRate',
      type: 'number',
      min: 0,
      admin: { description: 'Rate for category-based rule.' },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      admin: { description: 'Null = global default. Set for vendor override.' },
    },
    {
      name: 'priority',
      type: 'number',
      defaultValue: 0,
      admin: { description: 'Higher priority wins. Default 0.' },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
  timestamps: true,
}
