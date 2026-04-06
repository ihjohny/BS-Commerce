import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { isAdminOrVendorOwner } from '../../../access/is-admin-or-vendor-owner'
import { orderItemRelationId } from '../../../lib/order-item-relation-id'
import { transferStockReservation } from '../../../lib/transfer-stock-reservation'

/** True when PATCH value is the same as the stored document (Payload often merges full doc into `data`). */
function vendorPatchValueUnchanged(incoming: unknown, previous: unknown): boolean {
  if (incoming === previous) return true
  const inc = orderItemRelationId(incoming)
  const prev = orderItemRelationId(previous)
  if (inc != null && prev != null) return inc === prev
  /* Both nullish: relation id is only null when val == null, so values are absent-equivalent. */
  if (inc == null && prev == null) return true
  return false
}

export function createOrderItemsConfig(splitByVendor: boolean): CollectionConfig {
  const fields: NonNullable<CollectionConfig['fields']> = [
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
      admin: { description: 'Parent order.' },
    },
    ...(splitByVendor
      ? [
          {
            name: 'subOrder',
            type: 'relationship' as const,
            relationTo: 'sub-orders',
            admin: { description: 'Vendor sub-order this item belongs to.' },
          },
          {
            name: 'tenant',
            type: 'relationship' as const,
            relationTo: 'tenants',
            admin: { description: 'Vendor who owns this item.' },
          },
        ]
      : []),
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
      name: 'stockLevel',
      type: 'relationship',
      relationTo: 'stock-levels',
      admin: {
        description:
          'Warehouse stock row used for fulfillment (Phase 12). Changes move reservation between warehouses.',
      },
    },
    {
      name: 'productName',
      type: 'text',
      required: true,
      admin: { description: 'Snapshot at time of purchase.' },
    },
    {
      name: 'itemLabel',
      type: 'text',
      admin: {
        description: 'Display label for admin (e.g. "Product Name × 2"). Set automatically.',
        readOnly: true,
        hidden: true, // used only for useAsTitle in relationship pills
      },
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
  ]

  return {
    slug: 'order-items',
    admin: {
      useAsTitle: 'itemLabel',
      defaultColumns: splitByVendor
        ? ['order', 'subOrder', 'productName', 'variantName', 'stockLevel', 'quantity', 'unitPrice', 'totalPrice']
        : ['order', 'productName', 'variantName', 'stockLevel', 'quantity', 'unitPrice', 'totalPrice'],
      group: 'Orders',
      description: 'Line items for an order. Created at checkout from cart.',
    },
    access: {
      create: isAdmin,
      // Vendors need read so relationship titles (itemLabel) resolve in admin when viewing sub-orders
      read: splitByVendor ? isAdminOrVendorOwner : isAdmin,
      update: splitByVendor ? isAdminOrVendorOwner : isAdmin,
      delete: isAdmin,
    },
    fields,
    timestamps: true,
    hooks: {
      beforeChange: [
        ({ data, originalDoc, req, operation }) => {
          if (operation === 'update' && req.user?.role === 'vendor' && data && originalDoc) {
            const orig = originalDoc as Record<string, unknown>
            const patch = data as Record<string, unknown>
            for (const key of Object.keys(patch)) {
              if (key === 'updatedAt') continue
              if (key === 'stockLevel') continue
              if (vendorPatchValueUnchanged(patch[key], orig[key])) continue
              throw new Error('Vendors may only update fulfillment warehouse (stock level).')
            }
          }
          return data
        },
        async ({ data, originalDoc, req, operation }) => {
          if (operation !== 'update' || !data || data.stockLevel === undefined || !originalDoc) {
            return data
          }
          const oldId = orderItemRelationId(originalDoc.stockLevel)
          const newId = orderItemRelationId(data.stockLevel)
          if (!oldId || !newId || oldId === newId) {
            return data
          }
          const qty = Number(originalDoc.quantity) || 1
          await transferStockReservation(req.payload, { fromStockLevelId: oldId, toStockLevelId: newId, quantity: qty }, req)
          return data
        },
        ({ data }) => {
          if (data?.productName != null) {
            /* c8 ignore next — Number() never returns null/undefined; ?? 1 is defensive. */
            const qty = Number(data.quantity) ?? 1
            data.itemLabel = `${data.productName} × ${qty}`
          }
          return data
        },
      ],
      afterRead: [
        ({ doc }) => {
          if (doc && !doc.itemLabel && doc.productName) {
            /* c8 ignore next — Number() never returns null/undefined; ?? 1 is defensive. */
            const qty = Number(doc.quantity) ?? 1
            ;(doc as { itemLabel?: string }).itemLabel = `${doc.productName} × ${qty}`
          }
          return doc
        },
      ],
    },
  }
}
