import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'

export const OrderItems: CollectionConfig = {
  slug: 'order-items',
  admin: {
    useAsTitle: 'productName',
    defaultColumns: ['order', 'productName', 'variantName', 'quantity', 'unitPrice', 'totalPrice'],
    group: 'Orders',
    description: 'Line items for an order. Created at checkout from cart.',
  },
  access: {
    create: isAdmin, // Only created via process-checkout, not by users directly
    read: isAdmin, // Customers read via order
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
      admin: { description: 'Parent order.' },
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      admin: { description: 'Snapshot reference. Product may change later.' },
    },
    {
      name: 'variant',
      type: 'relationship',
      relationTo: 'product-variants',
      admin: { description: 'Variant if applicable.' },
    },
    {
      name: 'productName',
      type: 'text',
      required: true,
      admin: { description: 'Snapshot at time of purchase.' },
    },
    {
      name: 'variantName',
      type: 'text',
      admin: { description: 'Snapshot at time of purchase.' },
    },
    {
      name: 'sku',
      type: 'text',
      admin: { description: 'Snapshot at time of purchase.' },
    },
    { name: 'quantity', type: 'number', required: true, min: 1 },
    { name: 'unitPrice', type: 'number', required: true, min: 0 },
    { name: 'totalPrice', type: 'number', required: true, min: 0 },
    {
      name: 'productImage',
      type: 'text',
      admin: { description: 'Snapshot URL at time of purchase.' },
    },
  ],
  timestamps: true,
}
