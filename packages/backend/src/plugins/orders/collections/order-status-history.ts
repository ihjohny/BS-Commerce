import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'

export const OrderStatusHistory: CollectionConfig = {
  slug: 'order-status-history',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['order', 'fromStatus', 'toStatus', 'changedBy', 'timestamp'],
    group: 'Orders',
    description: 'Audit log of order status changes.',
  },
  access: {
    create: isAdmin, // Only via hooks
    read: isAdmin,
    update: () => false, // Immutable
    delete: isAdmin,
  },
  fields: [
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
    },
    { name: 'fromStatus', type: 'text', admin: { description: 'Previous status.' } },
    { name: 'toStatus', type: 'text', required: true },
    {
      name: 'changedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { description: 'User who changed the status.' },
    },
    { name: 'reason', type: 'textarea' },
    { name: 'timestamp', type: 'date', required: true, defaultValue: () => new Date().toISOString() },
  ],
  timestamps: true,
}
