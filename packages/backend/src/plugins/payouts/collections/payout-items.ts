import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { isAdminOrVendorOwner } from '../../../access/is-admin-or-vendor-owner'

/**
 * Payout Items — line items linking sub-orders to payouts.
 */
export const PayoutItems: CollectionConfig = {
  slug: 'payout-items',
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['payout', 'subOrder', 'orderNumber', 'amount', 'commission', 'status'],
    group: 'Payouts',
  },
  access: {
    create: isAdmin,
    read: isAdminOrVendorOwner,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'payout',
      type: 'relationship',
      relationTo: 'payouts',
      required: true,
    },
    {
      name: 'subOrder',
      type: 'relationship',
      relationTo: 'sub-orders',
      required: true,
    },
    { name: 'orderNumber', type: 'text', admin: { description: 'For reference.' } },
    { name: 'amount', type: 'number', required: true },
    { name: 'commission', type: 'number', required: true, defaultValue: 0 },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'included',
      options: [
        { label: 'Included', value: 'included' },
        { label: 'Held', value: 'held' },
        { label: 'Disputed', value: 'disputed' },
      ],
    },
  ],
  timestamps: true,
}
