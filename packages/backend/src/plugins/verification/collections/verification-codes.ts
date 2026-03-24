import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'

/**
 * Stores verification codes/tokens for email and phone verification.
 * Single-use; expires after configured time. Admin can read for support.
 */
export const VerificationCodes: CollectionConfig = {
  slug: 'verification-codes',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['identifier', 'type', 'used', 'expiresAt', 'createdAt'],
    group: 'Platform',
    description: 'Email/phone verification codes and tokens. Single-use, auto-expire.',
  },
  access: {
    create: () => false, // Only created by verification endpoints
    read: isAdmin,
    update: () => false,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'identifier',
      type: 'text',
      required: true,
      admin: { description: 'Email address or phone number.' },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Email', value: 'email' },
        { label: 'Phone', value: 'phone' },
      ],
    },
    {
      name: 'code',
      type: 'text',
      required: true,
      admin: { description: 'OTP code or link token (hashed or plain per strategy).' },
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
      admin: { description: 'After this time the code is invalid.' },
    },
    {
      name: 'used',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'usedAt',
      type: 'date',
      admin: { description: 'When the code was consumed.' },
    },
    {
      name: 'ip',
      type: 'text',
      admin: {
        description: 'Origin IP address when the code was created (for rate limiting / audit).',
      },
    },
  ],
  timestamps: true,
}
