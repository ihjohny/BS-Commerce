import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'

/**
 * Payouts — vendor earnings disbursement records.
 * Manual ledger default (SSLCommerz no split payments).
 */
export const Payouts: CollectionConfig = {
  slug: 'payouts',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['tenant', 'periodStart', 'periodEnd', 'netAmount', 'status', 'processedAt'],
    group: 'Payouts',
    description: 'Vendor payout records. Admin disburses manually or via bank transfer.',
  },
  access: {
    create: isAdmin,
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      if (req.user.role === 'vendor' && req.user.tenant) {
        const tenantId = typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user.tenant
        return { tenant: { equals: tenantId } }
      }
      return false
    },
    update: isAdmin,
    delete: () => false,
  },
  fields: [
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
    },
    { name: 'periodStart', type: 'date', required: true },
    { name: 'periodEnd', type: 'date', required: true },
    { name: 'totalEarnings', type: 'number', required: true, defaultValue: 0 },
    { name: 'totalCommission', type: 'number', required: true, defaultValue: 0 },
    { name: 'netAmount', type: 'number', required: true, defaultValue: 0 },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
        { label: 'On Hold', value: 'on-hold' },
      ],
    },
    {
      name: 'method',
      type: 'text',
      admin: { description: 'e.g. stripe-transfer, bank-transfer, manual' },
    },
    { name: 'providerPayoutId', type: 'text' },
    {
      name: 'items',
      type: 'relationship',
      relationTo: 'payout-items',
      hasMany: true,
    },
    { name: 'processedAt', type: 'date' },
    { name: 'notes', type: 'textarea' },
  ],
  timestamps: true,
}
