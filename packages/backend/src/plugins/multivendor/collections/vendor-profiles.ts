import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { isAdminOrVendorOwner } from '../../../access/is-admin-or-vendor-owner'

/**
 * Vendor Profiles — public-facing store page at /store/[vendor-slug].
 * One-to-one with Tenants.
 */
export const VendorProfiles: CollectionConfig = {
  slug: 'vendor-profiles',
  admin: {
    useAsTitle: 'displayName',
    defaultColumns: ['displayName', 'tenant', 'rating', 'totalSales', 'joinedAt'],
    group: 'Multivendor',
    description: 'Public vendor store profiles. Shown at /store/[vendor-slug].',
  },
  access: {
    create: isAdmin,
    read: ({ req }) => {
      // Guest/customer: read published profiles (all are public when approved)
      if (!req.user) return true
      if (req.user.role === 'admin') return true
      if (req.user.role === 'vendor') return isAdminOrVendorOwner({ req })
      // Customer: read all (public directory)
      return true
    },
    update: isAdminOrVendorOwner,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      unique: true,
      admin: { description: 'The vendor (tenant) this profile belongs to.' },
    },
    { name: 'displayName', type: 'text', required: true, localized: true },
    {
      name: 'description',
      type: 'richText',
      localized: true,
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'banner',
      type: 'upload',
      relationTo: 'media',
    },
    { name: 'contactEmail', type: 'email' },
    { name: 'contactPhone', type: 'text' },
    { name: 'website', type: 'text' },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        { name: 'platform', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
    {
      name: 'address',
      type: 'group',
      fields: [
        { name: 'street', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'state', type: 'text' },
        { name: 'country', type: 'text' },
        { name: 'zip', type: 'text' },
      ],
    },
    {
      name: 'rating',
      type: 'number',
      admin: { description: 'Aggregated from approved vendor reviews.', readOnly: true },
      defaultValue: 0,
    },
    {
      name: 'totalSales',
      type: 'number',
      admin: { description: 'Denormalized sales counter.', readOnly: true },
      defaultValue: 0,
    },
    { name: 'joinedAt', type: 'date' },
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
  ],
  timestamps: true,
}
