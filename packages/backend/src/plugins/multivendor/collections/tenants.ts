import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { slugField } from '../../../fields/slug'

/**
 * Tenants — multi-purpose isolation entity.
 * type = 'platform-store': an internal outlet/branch managed by the platform owner.
 * type = 'vendor': an independent marketplace seller.
 * Used for tenant-scoped data isolation (products, orders, media, stock).
 */
export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'type', 'createdAt'],
    group: 'Multivendor',
    description: 'Platform stores and vendor tenants. Each tenant isolates products, orders, and inventory.',
  },
  access: {
    create: isAdmin,
    read: ({ req }) => {
      // Storefront needs public tenant name/slug for /store/[slug] and nested REST depth.
      if (!req.user) return true
      if (req.user.role === 'admin') return true
      // Vendor: can only read their own tenant
      if (req.user.role === 'vendor' && req.user.tenant) {
        const tenantId = typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user.tenant
        return { id: { equals: tenantId } }
      }
      return true
    },
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField('name'),
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'vendor',
      options: [
        { label: 'Platform Store', value: 'platform-store' },
        { label: 'Vendor', value: 'vendor' },
      ],
      admin: {
        description:
          'platform-store = internal outlet/branch. vendor = independent marketplace seller.',
      },
    },
  ],
  timestamps: true,
}
