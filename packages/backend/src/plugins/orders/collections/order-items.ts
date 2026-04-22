import type { Access, CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { isAdminOrVendorOwner } from '../../../access/is-admin-or-vendor-owner'
import { orderItemRelationId } from '../../../lib/order-item-relation-id'
import { transferStockReservation } from '../../../lib/transfer-stock-reservation'

/** Compare snapshot scalars; allow float tolerance for numbers. */
function snapshotScalarEqual(incoming: unknown, previous: unknown): boolean {
  if (incoming === previous) return true
  if (typeof incoming === 'number' && typeof previous === 'number') {
    return Math.abs(incoming - previous) < 1e-9
  }
  return false
}

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

/**
 * Line items must be readable by the owning customer so order detail APIs can populate `items`
 * (snapshot fields). Admins/vendors keep existing rules.
 */
function orderItemsReadAccess(splitByVendor: boolean): Access {
  return (args) => {
    const user = args.req.user
    if (!user) return false
    if (user.role === 'admin') return true
    if (user.role === 'customer') {
      /* Where: line items for orders belonging to this customer (storefront order detail). */
      return {
        order: {
          customer: {
            equals: user.id,
          },
        },
      } as any
    }
    if (splitByVendor) {
      return isAdminOrVendorOwner(args)
    }
    return false
  }
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
    ...(splitByVendor
      ? [
          {
            name: 'vendorNameSnapshot',
            type: 'text' as const,
            admin: { description: 'Vendor display name at checkout (immutable).' },
          },
        ]
      : []),
  ]

  return {
    slug: 'order-items',
    admin: {
      useAsTitle: 'itemLabel',
      defaultColumns: splitByVendor
        ? ['order', 'subOrder', 'productName', 'variantName', 'stockLevel', 'quantity', 'unitPrice', 'totalPrice']
        : ['order', 'productName', 'variantName', 'stockLevel', 'quantity', 'unitPrice', 'totalPrice'],
      group: 'Orders',
      description:
        'Line items for an order. Created at checkout from cart. Commercial snapshots (title, SKU, price, qty) are immutable after create; admins may still change stock level for fulfillment routing. Shipping address, store, and totals live on the parent order / sub-order.',
    },
    access: {
      create: isAdmin,
      read: orderItemsReadAccess(splitByVendor),
      update: splitByVendor ? isAdminOrVendorOwner : isAdmin,
      delete: isAdmin,
    },
    fields,
    timestamps: true,
    hooks: {
      beforeChange: [
        ({ data, operation, originalDoc }) => {
          if (operation !== 'update' || !data || !originalDoc) return data
          const snapFields: string[] = [
            'productName',
            'variantName',
            'sku',
            'unitPrice',
            'totalPrice',
            'productImage',
            'quantity',
            'itemLabel',
          ]
          if (splitByVendor) snapFields.push('vendorNameSnapshot')
          const orig = originalDoc as Record<string, unknown>
          const patch = data as Record<string, unknown>
          for (const key of snapFields) {
            if (!(key in patch)) continue
            if (snapshotScalarEqual(patch[key], orig[key])) continue
            throw new Error(`Order line snapshots cannot be changed after creation (${key}).`)
          }
          const relKeys = ['order', 'subOrder', 'tenant', 'product', 'variant'] as const
          for (const key of relKeys) {
            if (!(key in patch)) continue
            if (vendorPatchValueUnchanged(patch[key], orig[key])) continue
            throw new Error(`Cannot change ${key} after order item creation.`)
          }
          return data
        },
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
