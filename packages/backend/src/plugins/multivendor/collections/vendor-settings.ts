import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { isAdminOrVendorOwner } from '../../../access/is-admin-or-vendor-owner'

/**
 * Vendor Settings — one per tenant (enforced by unique tenant).
 * Overrides platform defaults (commission, payout, shipping).
 */
export const VendorSettings: CollectionConfig = {
  slug: 'vendor-settings',
  admin: {
    useAsTitle: 'tenant',
    defaultColumns: ['tenant', 'commissionRate', 'isActive', 'updatedAt'],
    group: 'Multivendor',
    description: 'Per-vendor settings. One record per tenant.',
  },
  access: {
    create: isAdmin,
    read: isAdminOrVendorOwner,
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
      admin: { description: 'One settings record per vendor.' },
    },
    {
      name: 'commissionRate',
      type: 'number',
      min: 0,
      max: 100,
      admin: { description: 'Override default platform commission %.' },
    },
    {
      name: 'commissionType',
      type: 'select',
      options: [
        { label: 'Percentage', value: 'percentage' },
        { label: 'Flat', value: 'flat' },
        { label: 'Tiered', value: 'tiered' },
      ],
      admin: { description: 'Override default strategy.' },
    },
    {
      name: 'payoutMethod',
      type: 'select',
      options: [
        { label: 'Stripe', value: 'stripe' },
        { label: 'Bank Transfer', value: 'bank-transfer' },
        { label: 'Manual', value: 'manual' },
      ],
    },
    { name: 'stripeConnectAccountId', type: 'text' },
    {
      name: 'bankDetails',
      type: 'group',
      fields: [
        { name: 'bankName', type: 'text' },
        { name: 'accountNumber', type: 'text' },
        { name: 'routingNumber', type: 'text' },
        { name: 'iban', type: 'text' },
      ],
    },
    {
      name: 'shippingModel',
      type: 'select',
      options: [
        { label: 'Platform', value: 'platform' },
        { label: 'Vendor', value: 'vendor' },
        { label: 'Hybrid', value: 'hybrid' },
      ],
      admin: { description: 'Override default shipping model.' },
    },
    {
      name: 'autoPublishProducts',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'If false, products start as draft.' },
    },
    {
      name: 'maxProducts',
      type: 'number',
      min: 0,
      admin: { description: '0 = unlimited.' },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Admin can deactivate vendor.' },
    },
    { name: 'suspensionReason', type: 'textarea' },
  ],
  timestamps: true,
}
