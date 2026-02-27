import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { isOrderOwnerOrAdmin } from '../../../access/is-order-owner-or-admin'
import { getDefaultCurrency } from '../../../lib/currencies'
import type { OrderItemLike } from '../../../lib/release-order-inventory'
import { releaseOrderInventory } from '../../../lib/release-order-inventory'

const addressGroupFields = [
  { name: 'firstName', type: 'text' as const, required: true },
  { name: 'lastName', type: 'text' as const, required: true },
  { name: 'street1', type: 'text' as const, required: true },
  { name: 'street2', type: 'text' as const },
  { name: 'city', type: 'text' as const, required: true },
  { name: 'state', type: 'text' as const },
  { name: 'postalCode', type: 'text' as const },
  { name: 'country', type: 'text' as const, required: true },
  { name: 'phone', type: 'text' as const },
]

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'customer', 'status', 'grandTotal', 'currency', 'placedAt'],
    group: 'Orders',
    description:
      'Customer orders. Use status=Cancelled to cancel (releases inventory). Orders are never deleted (audit/tax).',
  },
  hooks: {
    beforeDelete: [
      async ({ id, req }) => {
        const payload = req.payload
        const orderId = id

        const { docs: itemDocs } = await payload.find({
          collection: 'order-items',
          where: { order: { equals: orderId } },
          limit: 1000,
          depth: 1,
        })
        await releaseOrderInventory(payload, itemDocs as OrderItemLike[], req)

        // Delete related records before order (FK constraints)
        const { docs: historyDocs } = await payload.find({
          collection: 'order-status-history',
          where: { order: { equals: orderId } },
          limit: 1000,
          depth: 0,
        })
        for (const h of historyDocs) {
          await payload.delete({ collection: 'order-status-history', id: h.id, overrideAccess: true, req })
        }
        const { docs: txDocs } = await payload.find({
          collection: 'transactions',
          where: { order: { equals: orderId } },
          limit: 100,
          depth: 0,
        })
        for (const tx of txDocs) {
          await payload.delete({ collection: 'transactions', id: tx.id, overrideAccess: true, req })
        }
        for (const item of itemDocs) {
          await payload.delete({ collection: 'order-items', id: item.id, overrideAccess: true, req })
        }
      },
    ],
    beforeChange: [
      async ({ data, operation }) => {
        if (operation === 'create' && data && !data.orderNumber) {
          const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
          const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
          data.orderNumber = `ORD-${date}-${suffix}`
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        // Skip create: order-status-history for new orders is created in process-checkout
        if (operation === 'create') return doc

        const payload = req.payload
        const orderId = doc.id
        const fromStatus = previousDoc?.status ?? null
        const toStatus = doc.status

        // Release reserved inventory when order is cancelled (industry standard: cancel, don't delete)
        if (toStatus === 'cancelled') {
          const { docs: itemDocs } = await payload.find({
            collection: 'order-items',
            where: { order: { equals: orderId } },
            limit: 1000,
            depth: 1,
          })
          await releaseOrderInventory(payload, itemDocs as OrderItemLike[], req)
        }

        // process-checkout creates status-history when simulatePayment; skip to avoid nested create
        if ((req as { context?: { skipOrderStatusHistory?: boolean } })?.context?.skipOrderStatusHistory) return doc
        if (fromStatus && toStatus && fromStatus !== toStatus) {
          const historyData: Record<string, unknown> = {
            order: orderId,
            fromStatus,
            toStatus,
            timestamp: new Date().toISOString(),
          }
          if (req.user?.id != null) historyData.changedBy = req.user.id
          await payload.create({
            collection: 'order-status-history',
            overrideAccess: true,
            data: historyData as any,
            req,
          })
        }
        return doc
      },
    ],
  },
  access: {
    create: isAdmin, // Orders created via process-checkout (overrideAccess)
    read: isOrderOwnerOrAdmin,
    update: isAdmin,
    // Industry standard: never delete orders (audit, tax, disputes). Use status=cancelled instead.
    delete: () => false,
  },
  fields: [
    {
      name: 'orderNumber',
      type: 'text',
      required: true,
      unique: true,
      admin: { readOnly: true, description: 'Auto-generated e.g. ORD-20260225-XXXX.' },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      admin: { description: 'Null for guest checkout.' },
    },
    {
      name: 'guestEmail',
      type: 'email',
      admin: { description: 'For guest checkout.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Partially Shipped', value: 'partially-shipped' },
        { label: 'Shipped', value: 'shipped' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Refunded', value: 'refunded' },
      ],
    },
    {
      name: 'items',
      type: 'relationship',
      relationTo: 'order-items',
      hasMany: true,
      admin: { description: 'Order line items.' },
    },
    {
      name: 'shippingAddress',
      type: 'group',
      required: true,
      fields: addressGroupFields,
    },
    {
      name: 'billingAddress',
      type: 'group',
      required: true,
      fields: addressGroupFields,
    },
    { name: 'subtotal', type: 'number', required: true, defaultValue: 0 },
    { name: 'shippingTotal', type: 'number', required: true, defaultValue: 0 },
    { name: 'taxTotal', type: 'number', required: true, defaultValue: 0 },
    { name: 'discountTotal', type: 'number', required: true, defaultValue: 0 },
    { name: 'grandTotal', type: 'number', required: true, defaultValue: 0 },
    {
      name: 'currency',
      type: 'text',
      required: true,
      defaultValue: () => getDefaultCurrency(),
    },
    {
      name: 'paymentStatus',
      type: 'select',
      required: true,
      defaultValue: 'unpaid',
      options: [
        { label: 'Unpaid', value: 'unpaid' },
        { label: 'Paid', value: 'paid' },
        { label: 'Partially Refunded', value: 'partially-refunded' },
        { label: 'Refunded', value: 'refunded' },
      ],
    },
    {
      name: 'transaction',
      type: 'relationship',
      relationTo: 'transactions',
      admin: { description: 'Primary payment transaction.' },
    },
    { name: 'notes', type: 'textarea', admin: { description: 'Customer notes.' } },
    { name: 'placedAt', type: 'date', admin: { description: 'When order was placed.' } },
  ],
  timestamps: true,
}
