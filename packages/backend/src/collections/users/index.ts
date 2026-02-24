import type { CollectionConfig, FieldAccess, PayloadRequest } from 'payload'
import { isAdmin } from '../../access/is-admin'
import { isSelfOrAdmin } from '../../access/is-self-or-admin'

// Field-level access: must return boolean only (FieldAccess, not collection Access)
const adminOnly: FieldAccess = ({ req }) => req.user?.role === 'admin'

// access.admin must return boolean only (not AccessResult/Where).
// Admins and vendors can use the admin panel; collection/field access enforces what they can do.
const canAccessAdmin = ({ req }: { req: PayloadRequest }): boolean =>
  req.user?.role === 'admin' || req.user?.role === 'vendor'

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
    admin: canAccessAdmin, // Only admins can access the admin panel (create-first-user allows when no users exist)
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

    // tenant field added in Phase 4 (multivendor plugin — tenants collection)
    // addresses field added in Phase 2 (ecommerce plugin — addresses collection)
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
