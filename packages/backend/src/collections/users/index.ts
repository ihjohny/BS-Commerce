import type { CollectionConfig, FieldAccess, PayloadRequest } from 'payload'
import { isAdmin } from '../../access/is-admin'
import { isSelfOrAdmin } from '../../access/is-self-or-admin'
import {
  getAuthRequiredIdentifier,
  toLoginIdentifier,
  validateAuthIdentifier,
} from '../../lib/auth-config'
import { shouldResetEmailVerified, shouldResetPhoneVerified } from '../../lib/user-verification-reset'

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
    // Decision #18: login with email OR phone. username stores the login identifier (email or phone).
    loginWithUsername: { allowEmailLogin: true },
  },
  admin: {
    useAsTitle: 'username',
    defaultColumns: ['username', 'email', 'phone', 'role', 'status', 'createdAt'],
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
        description: 'Required if phone is not provided (configurable via AUTH_REQUIRED_IDENTIFIER).',
      },
    },
    {
      name: 'phone',
      type: 'text',
      unique: true,
      admin: {
        description: 'Required if email is not provided (configurable via AUTH_REQUIRED_IDENTIFIER).',
      },
    },
    {
      name: 'username',
      type: 'text',
      unique: true,
      admin: {
        description: 'Login identifier — auto-set from email or phone. Do not edit.',
        readOnly: true,
        condition: (_, __, { operation }) => operation !== 'create', // Hide on create (auto-populated); show on edit
      },
      validate: (val: unknown) =>
        val && typeof val === 'string' && val.trim().length > 0 ? true : 'Required',
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

    // tenant field added by multivendor plugin when MULTIVENDOR_ENABLED=true
    {
      name: 'addresses',
      type: 'relationship',
      relationTo: 'addresses',
      hasMany: true,
    },
  ],

  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data) return data

        const identifier = getAuthRequiredIdentifier()
        validateAuthIdentifier(identifier, data)

        // create-first-user may send email in username; sync for storage
        const rawEmail = data.email ?? originalDoc?.email
        const rawPhone = data.phone ?? originalDoc?.phone
        const rawUsername = data.username
        if (!rawEmail && rawUsername && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(rawUsername).trim())) {
          data.email = String(rawUsername).trim().toLowerCase()
        }
        if (!rawPhone && rawUsername && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(rawUsername).trim()) && String(rawUsername).trim()) {
          data.phone = String(rawUsername).trim()
        }

        const email = data.email ?? originalDoc?.email
        const phone = data.phone ?? originalDoc?.phone
        const loginId = toLoginIdentifier(email, phone, data.username)
        if (loginId) {
          data.username = loginId.toLowerCase()
        }

        // Reset verification when identifier changes
        if (shouldResetEmailVerified(originalDoc, data)) {
          data.emailVerified = false
        }
        if (shouldResetPhoneVerified(originalDoc, data)) {
          data.phoneVerified = false
        }

        return data
      },
    ],
  },

  timestamps: true,
}
