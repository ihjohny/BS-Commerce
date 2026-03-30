import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { isOrderOwnerOrAdmin } from '../../../access/is-order-owner-or-admin'
import { getDefaultCurrency } from '../../../lib/currencies'
import { consumeOrderInventory } from '../../../lib/consume-order-inventory'
import { validateOrderStatusTransition } from '../../../lib/order-status-transitions'
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

export function createOrdersConfig(splitByVendor: boolean): CollectionConfig {
  const baseFields: NonNullable<CollectionConfig['fields']> = [
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
      name: 'idempotencyKey',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
        description:
          'Client-supplied UUID for idempotent checkout. If an order with this key already exists, the existing order is returned without creating a duplicate.',
      },
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
    {
      name: 'appliedCoupon',
      type: 'relationship',
      relationTo: 'coupons',
      admin: { description: 'Coupon used at checkout (if any).' },
    },
    {
      name: 'couponCodeSnapshot',
      type: 'text',
      admin: { readOnly: true, description: 'Coupon code snapshot at checkout time.' },
    },
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
  ]

  if (splitByVendor) {
    baseFields.splice(
      baseFields.findIndex((f) => typeof f === 'object' && 'name' in f && f.name === 'items') + 1,
      0,
      {
        name: 'subOrders',
        type: 'relationship' as const,
        relationTo: 'sub-orders',
        hasMany: true,
        admin: { description: 'Per-vendor segments. Vendors fulfill their sub-orders.' },
      }
    )
  }

  return {
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
          if (splitByVendor) {
            const { docs: subOrderDocs } = await payload.find({
              collection: 'sub-orders',
              where: { parentOrder: { equals: orderId } },
              limit: 100,
              depth: 0,
            })
            for (const so of subOrderDocs) {
              await payload.delete({ collection: 'sub-orders', id: so.id, overrideAccess: true, req })
            }
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
        ({ data, operation, originalDoc }) => {
          if (operation === 'update' && data?.status != null) {
            const from = (originalDoc as { status?: string } | undefined)?.status
            validateOrderStatusTransition(from, data.status as string)
          }
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
          if (operation === 'create') return doc

          const payload = req.payload
          const orderId = doc.id
          const fromStatus = previousDoc?.status ?? null
          const toStatus = doc.status

          if (toStatus === 'cancelled') {
            const { docs: itemDocs } = await payload.find({
              collection: 'order-items',
              where: { order: { equals: orderId } },
              limit: 1000,
              depth: 1,
            })
            await releaseOrderInventory(payload, itemDocs as OrderItemLike[], req)
          }

          // Single-vendor: consume inventory when order status → shipped
          const alreadyShipped = ['shipped', 'delivered', 'completed'].includes(fromStatus ?? '')
          if (!splitByVendor && toStatus === 'shipped' && !alreadyShipped) {
            const { docs: itemDocs } = await payload.find({
              collection: 'order-items',
              where: { order: { equals: orderId } },
              limit: 1000,
              depth: 1,
            })
            await consumeOrderInventory(payload, itemDocs as OrderItemLike[], req)
          }

          if ((req as { context?: { skipOrderStatusHistory?: boolean } })?.context?.skipOrderStatusHistory)
            return doc
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
      create: isAdmin,
      read: isOrderOwnerOrAdmin,
      update: isAdmin,
      delete: () => false,
    },
    fields: baseFields,
    timestamps: true,
  }
}

