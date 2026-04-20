import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { isAdminOrVendorOwner } from '../../../access/is-admin-or-vendor-owner'

export function createProductVariantsConfig(multivendorEnabled = false): CollectionConfig {
  const fields: CollectionConfig['fields'] = [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
    },
    { name: 'name', type: 'text', required: true },
    { name: 'sku', type: 'text', unique: true, admin: { description: 'Unique per variant. Leave empty for auto-generated.' } },
    { name: 'price', type: 'number', required: true, min: 0 },
    { name: 'compareAtPrice', type: 'number', min: 0 },
    {
      name: 'saleDisplayMode',
      type: 'select',
      required: true,
      defaultValue: 'inherit',
      options: [
        { label: 'Inherit from product', value: 'inherit' },
        { label: 'None (hide compare-at & badges)', value: 'none' },
        { label: 'Strikethrough compare-at only', value: 'strike_through' },
        { label: 'Badge: % off', value: 'badge_percent' },
        { label: 'Badge: amount saved', value: 'badge_amount' },
        { label: 'Strikethrough + badge', value: 'strike_and_badge' },
      ],
      admin: {
        description:
          'Leave empty to use the product’s sale display mode. Set to override for this SKU only.',
      },
    },
    {
      name: 'options',
      type: 'array',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'value', type: 'text', required: true },
      ],
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    { name: 'weight', type: 'number', min: 0 },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ]

  if (multivendorEnabled) {
    fields.splice(1, 0, {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      admin: { description: 'Inherited from product. Auto-set on save.' },
    })
  }

  return {
    slug: 'product-variants',
    admin: {
      useAsTitle: 'name',
      defaultColumns: multivendorEnabled
        ? ['name', 'sku', 'price', 'product', 'tenant', 'isActive']
        : ['name', 'sku', 'price', 'product', 'isActive'],
      group: 'Ecommerce',
    },
    access: {
      create: multivendorEnabled ? isAdminOrVendorOwner : isAdmin,
      read: ({ req }) => {
        if (!req.user) return { isActive: { equals: true } }
        if (req.user.role === 'admin') return true
        if (multivendorEnabled && req.user.role === 'vendor') return isAdminOrVendorOwner({ req })
        return { isActive: { equals: true } }
      },
      update: multivendorEnabled ? isAdminOrVendorOwner : isAdmin,
      delete: multivendorEnabled ? isAdminOrVendorOwner : isAdmin,
    },
    hooks: multivendorEnabled
      ? {
          beforeValidate: [
            async ({ data, req }) => {
              if (!data) return data
              if (!data.tenant && data.product) {
                const productId = typeof data.product === 'object' ? (data.product as { id?: string }).id : data.product
                if (productId && req.payload) {
                  const p = await req.payload.findByID({ collection: 'products', id: productId, depth: 0 })
                  if (p?.tenant) data.tenant = typeof p.tenant === 'object' ? (p.tenant as { id: string }).id : p.tenant
                }
              }
              if (req.user?.role === 'vendor' && req.user.tenant && !data.tenant) {
                const tenantId = typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user.tenant
                data.tenant = tenantId
              }
              return data
            },
          ],
        }
      : undefined,
    fields,
    timestamps: true,
  }
}

/** @deprecated Use createProductVariantsConfig(multivendorEnabled) */
export const ProductVariants: CollectionConfig = createProductVariantsConfig(false)
