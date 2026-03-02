import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { isAdminOrVendorOwner } from '../../../access/is-admin-or-vendor-owner'
import { slugField } from '../../../fields/slug'
import { getCurrencyOptions } from '../../../lib/currencies'

export function createProductsConfig(multivendorEnabled = false): CollectionConfig {
  const fields: CollectionConfig['fields'] = [
    { name: 'name', type: 'text', required: true, localized: true },
    slugField('name'),
    {
      name: 'description',
      type: 'richText',
      localized: true,
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      localized: true,
    },
    { name: 'sku', type: 'text' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Pending Review', value: 'pending-review' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
    },
    { name: 'featured', type: 'checkbox', defaultValue: false },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
    },
    {
      name: 'tags',
      type: 'array',
      fields: [{ name: 'tag', type: 'text' }],
    },
    {
      name: 'images',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    { name: 'basePrice', type: 'number', required: true, min: 0 },
    { name: 'compareAtPrice', type: 'number', min: 0 },
    { name: 'costPrice', type: 'number', min: 0 },
    {
      name: 'currency',
      type: 'select',
      required: true,
      defaultValue: 'USD',
      options: getCurrencyOptions(),
    },
    { name: 'taxable', type: 'checkbox', defaultValue: true },
    { name: 'weight', type: 'number', min: 0 },
    {
      name: 'dimensions',
      type: 'group',
      fields: [
        { name: 'length', type: 'number', min: 0 },
        { name: 'width', type: 'number', min: 0 },
        { name: 'height', type: 'number', min: 0 },
      ],
    },
    { name: 'hasVariants', type: 'checkbox', defaultValue: false },
    {
      name: 'meta',
      type: 'group',
      label: 'SEO',
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'description', type: 'textarea', localized: true },
        { name: 'image', type: 'upload', relationTo: 'media' },
      ],
    },
    { name: 'publishedAt', type: 'date' },
  ]

  if (multivendorEnabled) {
    fields.unshift({
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      admin: { description: 'Vendor (tenant) who owns this product.' },
    })
  }

  return {
    slug: 'products',
    admin: {
      useAsTitle: 'name',
      defaultColumns: multivendorEnabled
        ? ['name', 'slug', 'tenant', 'status', 'basePrice', 'currency', 'publishedAt']
        : ['name', 'slug', 'status', 'basePrice', 'currency', 'publishedAt'],
      group: 'Ecommerce',
    },
    access: {
      create: multivendorEnabled ? isAdminOrVendorOwner : isAdmin,
      read: ({ req }) => {
        if (!req.user) return { status: { equals: 'published' } }
        if (req.user.role === 'admin') return true
        if (multivendorEnabled && req.user.role === 'vendor') return isAdminOrVendorOwner({ req })
        return { status: { equals: 'published' } }
      },
      update: multivendorEnabled ? isAdminOrVendorOwner : isAdmin,
      delete: multivendorEnabled ? isAdminOrVendorOwner : isAdmin,
    },
    hooks: multivendorEnabled
      ? {
          beforeValidate: [
            ({ data, req }) => {
              if (!data) return data
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

/** @deprecated Use createProductsConfig(multivendorEnabled) */
export const Products: CollectionConfig = createProductsConfig(false)
