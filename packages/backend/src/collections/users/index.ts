import type { CollectionConfig, FieldAccess } from 'payload'
import { isAdmin } from '../../access/is-admin'
import { isSelfOrAdmin } from '../../access/is-self-or-admin'

// Field-level access: must return boolean only (FieldAccess, not collection Access)
const adminOnly: FieldAccess = ({ req }) => req.user?.role === 'admin'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 7200, // 2 hours
    verify: false,
    maxLoginAttempts: 5,
    lockTime: 600 * 1000, // 10 minutes
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'phone', 'role', 'status', 'createdAt'],
    group: 'Platform',
  },
  access: {
    create: () => true, // Public registration
    read: isSelfOrAdmin,
    update: isSelfOrAdmin,
    delete: isAdmin,
  },
  fields: [
    // ─── Identity: email OR phone required ────────────────────────────────────
    {
      name: 'email',
      type: 'email',
      unique: true,
      admin: {
        description: 'Required if phone is not provided.',
      },
    },
    {
      name: 'phone',
      type: 'text',
      unique: true,
      admin: {
        description: 'Required if email is not provided.',
      },
    },

    // ─── Profile ──────────────────────────────────────────────────────────────
    {
      name: 'firstName',
      type: 'text',
    },
    {
      name: 'lastName',
      type: 'text',
    },
    {
      name: 'displayName',
      type: 'text',
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },

    // ─── Role & Status ────────────────────────────────────────────────────────
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'customer',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Vendor', value: 'vendor' },
        { label: 'Customer', value: 'customer' },
      ],
      access: {
        update: adminOnly,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Banned', value: 'banned' },
      ],
      access: {
        update: adminOnly,
      },
    },

    // ─── Verification ─────────────────────────────────────────────────────────
    {
      name: 'emailVerified',
      type: 'checkbox',
      defaultValue: false,
      access: {
        update: adminOnly,
      },
    },
    {
      name: 'phoneVerified',
      type: 'checkbox',
      defaultValue: false,
      access: {
        update: adminOnly,
      },
    },

    // ─── Preferences ─────────────────────────────────────────────────────────
    {
      name: 'locale',
      type: 'select',
      defaultValue: 'en',
      options: [
        { label: 'English', value: 'en' },
        { label: 'বাংলা', value: 'bn' },
      ],
    },

    // ─── Multivendor: tenant relationship (set by multivendor plugin in Phase 4) ─
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants' as 'users', // cast: tenants collection added in Phase 4
      hasMany: false,
      admin: {
        condition: (data) => data?.role === 'vendor',
        description: 'Automatically assigned when vendor application is approved.',
        readOnly: true,
      },
      access: {
        update: adminOnly,
      },
    },

    // ─── Addresses ────────────────────────────────────────────────────────────
    {
      name: 'addresses',
      type: 'relationship',
      relationTo: 'addresses' as 'users', // cast: addresses collection added in Phase 2
      hasMany: true,
      admin: {
        readOnly: true,
        description: 'Managed via the addresses collection.',
      },
    },
  ],

  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data?.email && !data?.phone) {
          throw new Error('At least one of email or phone is required.')
        }
        return data
      },
    ],
  },

  timestamps: true,
}
