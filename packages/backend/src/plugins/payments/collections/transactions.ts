import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'

export const Transactions: CollectionConfig = {
  slug: 'transactions',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['order', 'type', 'provider', 'amount', 'currency', 'status', 'createdAt'],
    group: 'Payments',
    description: 'Payment transactions. Created at checkout or refund.',
  },
  access: {
    create: isAdmin, // Only via process-checkout or webhook
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Charge', value: 'charge' },
        { label: 'Refund', value: 'refund' },
        { label: 'Partial Refund', value: 'partial-refund' },
      ],
    },
    {
      name: 'provider',
      type: 'text',
      required: true,
      admin: { description: 'e.g. sslcommerz, stripe.' },
    },
    {
      name: 'providerTransactionId',
      type: 'text',
      admin: { description: 'Gateway transaction ID.' },
    },
    { name: 'amount', type: 'number', required: true, min: 0 },
    { name: 'currency', type: 'text', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Succeeded', value: 'succeeded' },
        { label: 'Failed', value: 'failed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
    {
      name: 'platformFee',
      type: 'number',
      admin: { description: 'Platform commission (multivendor).' },
    },
    {
      name: 'metadata',
      type: 'json',
      admin: { description: 'Provider-specific data.' },
    },
  ],
  timestamps: true,
}
