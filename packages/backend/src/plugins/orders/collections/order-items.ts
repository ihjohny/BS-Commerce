import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { isAdminOrVendorOwner } from '../../../access/is-admin-or-vendor-owner'

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
        ? ['order', 'subOrder', 'productName', 'variantName', 'quantity', 'unitPrice', 'totalPrice']
        : ['order', 'productName', 'variantName', 'quantity', 'unitPrice', 'totalPrice'],
      group: 'Orders',
      description: 'Line items for an order. Created at checkout from cart.',
    },
    access: {
      create: isAdmin,
      // Vendors need read so relationship titles (itemLabel) resolve in admin when viewing sub-orders
      read: splitByVendor ? isAdminOrVendorOwner : isAdmin,
      update: isAdmin,
      delete: isAdmin,
    },
    fields,
    timestamps: true,
    hooks: {
      beforeChange: [
        ({ data }) => {
          if (data?.productName != null) {
            const qty = Number(data.quantity) ?? 1
            data.itemLabel = `${data.productName} × ${qty}`
          }
          return data
        },
      ],
      afterRead: [
        ({ doc }) => {
          if (doc && !doc.itemLabel && doc.productName) {
            const qty = Number(doc.quantity) ?? 1
            ;(doc as { itemLabel?: string }).itemLabel = `${doc.productName} × ${qty}`
          }
          return doc
        },
      ],
    },
  }
}
