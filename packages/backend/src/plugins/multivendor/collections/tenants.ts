import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { slugField } from '../../../fields/slug'

/**
 * Tenants = Vendors. Each vendor is a tenant.
 * Used for tenant-scoped data isolation (products, orders, media).
 */
export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'createdAt'],
    group: 'Multivendor',
    description: 'Vendors (tenants). Each vendor has a tenant record for data isolation.',
  },
  access: {
    create: isAdmin,
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      // Vendor: can only read their own tenant
      if (req.user.role === 'vendor' && req.user.tenant) {
        const tenantId = typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user.tenant
        return { id: { equals: tenantId } }
      }
      return false
    },
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField('name'),
  ],
  timestamps: true,
}
