import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { isAdminOrVendorOwner } from '../../../access/is-admin-or-vendor-owner'
import { consumeOrderInventory } from '../../../lib/consume-order-inventory'
import { validateSubOrderStatusTransition } from '../../../lib/order-status-transitions'
import type { OrderItemLike } from '../../../lib/release-order-inventory'
import { releaseOrderInventory } from '../../../lib/release-order-inventory'

const subOrderStatusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Refunded', value: 'refunded' },
]

/**
 * Sub-Orders — per-vendor segments of a parent order.
 * When MULTIVENDOR_ENABLED, each vendor's items become a sub-order.
 * Vendors see only their sub-orders. Parent order status is derived from sub-order statuses.
 */
export const SubOrders: CollectionConfig = {
  slug: 'sub-orders',
  admin: {
    useAsTitle: 'subOrderNumber',
    defaultColumns: ['subOrderNumber', 'parentOrderNumber', 'tenant', 'status', 'subtotal', 'vendorEarnings', 'commissionAmount'],
    group: 'Orders',
    description: 'Per-vendor order segments. Vendors fulfill their own sub-orders.',
  },
  hooks: {
    beforeChange: [
      ({ data, operation, originalDoc }) => {
        if (operation !== 'update' || data?.status == null) return data
        const from = (originalDoc as { status?: string } | undefined)?.status
        validateSubOrderStatusTransition(from, data.status as string)
        return data
      },
    ],
    afterRead: [
      async ({ doc, req }) => {
        if (!doc || !doc.parentOrder) return doc
        if (doc.parentOrderNumber) return doc
        try {
          const orderId = typeof doc.parentOrder === 'object' ? (doc.parentOrder as { id: string }).id : doc.parentOrder
          const order = await req.payload.findByID({ collection: 'orders', id: orderId, depth: 0 })
          ;(doc as { parentOrderNumber?: string }).parentOrderNumber = (order as { orderNumber?: string }).orderNumber
        } catch {
          // ignore
        }
        return doc
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation === 'create') return doc
        const fromStatus = previousDoc?.status
        const toStatus = doc.status

        // Release inventory when sub-order is cancelled
        if (toStatus === 'cancelled') {
          const payload = req.payload
          const subOrderId = doc.id
          const { docs: itemDocs } = await payload.find({
            collection: 'order-items',
            where: { subOrder: { equals: subOrderId } },
            limit: 1000,
            depth: 1,
          })
          await releaseOrderInventory(payload, itemDocs as OrderItemLike[], req)
        }

        // Consume inventory when sub-order is shipped (decrement quantity + reservedQuantity)
        const alreadyShipped = ['shipped', 'delivered', 'completed'].includes(fromStatus ?? '')
        if (toStatus === 'shipped' && !alreadyShipped) {
          const payload = req.payload
          const subOrderId = doc.id
          const { docs: itemDocs } = await payload.find({
            collection: 'order-items',
            where: { subOrder: { equals: subOrderId } },
            limit: 1000,
            depth: 1,
          })
          await consumeOrderInventory(payload, itemDocs as OrderItemLike[], req)
        }
      },
      async ({ doc, previousDoc, operation, req }) => {
        if (operation === 'create') return doc
        const fromStatus = previousDoc?.status
        const toStatus = doc.status
        if (!fromStatus || !toStatus || fromStatus === toStatus) return doc

        const payload = req.payload
        const parentOrderId = typeof doc.parentOrder === 'object' ? (doc.parentOrder as { id: string }).id : doc.parentOrder
        if (!parentOrderId) return doc

        // Derive parent order status from sub-order statuses.
        // Use doc.status for the current sub-order (avoids read-after-write inconsistency).
        const { docs: subOrders } = await payload.find({
          collection: 'sub-orders',
          where: { parentOrder: { equals: parentOrderId } },
          limit: 100,
          depth: 0,
        })

        const statuses = (subOrders as Array<{ id: string; status?: string }>).map((so) =>
          so.id === doc.id ? (doc.status as string) : so.status
        ).filter(Boolean) as string[]

        // Industry standard: "shipped" = all sub-orders shipped; "partially-shipped" = only some.
        // Active = sub-orders not cancelled/refunded. We require ALL active to be at that stage.
        const strategy = (process.env.PARENT_ORDER_STATUS_STRATEGY ?? 'fulfillment-only').toLowerCase()
        const fulfillmentOnly = strategy !== 'strict'
        const active = statuses.filter((s) => s !== 'cancelled' && s !== 'refunded')
        const hasCancelledOrRefunded = statuses.some((s) => s === 'cancelled' || s === 'refunded')

        let newParentStatus: string | undefined
        if (statuses.length && statuses.every((s) => s === 'cancelled' || s === 'refunded')) {
          newParentStatus = 'cancelled'
        } else if (active.length === 0) {
          // None active (all cancelled/refunded or no statuses) — leave parent as-is
        } else if (!fulfillmentOnly && hasCancelledOrRefunded) {
          newParentStatus = 'partially-shipped'
        } else if (active.every((s) => s === 'completed')) {
          newParentStatus = 'completed'
        } else if (active.every((s) => s === 'delivered' || s === 'completed')) {
          newParentStatus = 'delivered'
        } else if (active.every((s) => ['shipped', 'delivered', 'completed'].includes(s))) {
          newParentStatus = 'shipped'
        } else if (active.some((s) => ['shipped', 'delivered', 'completed'].includes(s))) {
          newParentStatus = 'partially-shipped'
        }

        if (newParentStatus) {
          await payload.update({
            collection: 'orders',
            id: parentOrderId,
            overrideAccess: true,
            data: { status: newParentStatus },
            req,
          })
        }
        return doc
      },
    ],
  },
  access: {
    create: isAdmin, // Only created via process-checkout
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      if (req.user.role === 'vendor' && req.user.tenant) {
        const tenantId = typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user.tenant
        return { tenant: { equals: tenantId } }
      }
      return false
    },
    update: isAdminOrVendorOwner,
    delete: () => false, // Sub-orders follow parent order lifecycle
  },
  fields: [
    {
      name: 'parentOrder',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
      admin: {
        description: 'Parent customer order.',
        readOnly: true,
      },
    },
    {
      name: 'parentOrderNumber',
      type: 'text',
      admin: {
        description: 'Parent order number for display (e.g. ORD-20260302-ABCD). Auto-set on create.',
        readOnly: true,
      },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      admin: { description: 'Vendor fulfilling this segment.' },
    },
    {
      name: 'subOrderNumber',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'e.g. ORD-20260217-XXXX-A' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: subOrderStatusOptions,
    },
    {
      name: 'items',
      type: 'relationship',
      relationTo: 'order-items',
      hasMany: true,
      admin: { description: 'Order items for this vendor.' },
    },
    { name: 'subtotal', type: 'number', required: true, defaultValue: 0 },
    { name: 'shippingTotal', type: 'number', required: true, defaultValue: 0 },
    { name: 'taxTotal', type: 'number', required: true, defaultValue: 0 },
    {
      name: 'commissionAmount',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: { description: 'Platform fee for this sub-order.' },
    },
    {
      name: 'commissionRate',
      type: 'number',
      admin: { description: 'Snapshot of rate at order time.' },
    },
    {
      name: 'vendorEarnings',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: { description: 'subtotal - commissionAmount.' },
    },
    { name: 'shippingMethod', type: 'text' },
    { name: 'trackingNumber', type: 'text' },
    { name: 'trackingUrl', type: 'text' },
    { name: 'shippedAt', type: 'date' },
    { name: 'deliveredAt', type: 'date' },
    {
      name: 'fulfilledBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { description: 'Vendor user who processed shipment.' },
    },
    {
      name: 'store',
      type: 'relationship',
      relationTo: 'stock-locations',
      admin: { description: 'Store/outlet fulfilling this sub-order. Set at checkout from cart.store.' },
    },
  ],
  timestamps: true,
}
