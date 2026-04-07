import type { GlobalConfig } from 'payload'
import { isAdmin } from '../access/is-admin'

export const PlatformSettings: GlobalConfig = {
  slug: 'platform-settings',
  label: 'Platform Settings',
  admin: {
    group: 'Globals',
    description: 'Global platform configuration, feature flags, and currency settings.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    update: isAdmin,
  },
  fields: [
    // ─── General ──────────────────────────────────────────────────────────────
    {
      name: 'platformName',
      type: 'text',
      defaultValue: 'BS-Commerce',
    },
    {
      name: 'supportEmail',
      type: 'email',
    },
    {
      name: 'supportPhone',
      type: 'text',
    },

    // ─── Admin UI branding (Payload admin login + nav) ────────────────────────
    {
      name: 'adminBranding',
      type: 'group',
      label: 'Admin panel branding',
      admin: {
        description:
          'Custom logo and favicon for the Payload admin (login screen and sidebar). Upload files in Media first, then select them here. Leave empty to use the built-in default marks.',
      },
      fields: [
        {
          name: 'logo',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description: 'Main logo or wordmark (PNG, WebP, or SVG).',
          },
        },
        {
          name: 'favicon',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description: 'Browser tab icon — square PNG or ICO, at least 32×32.',
          },
        },
        {
          name: 'loginTagline',
          type: 'text',
          admin: {
            description:
              'Optional line under the logo on the login screen (e.g. "My Store · Admin"). Leave empty for the default tagline.',
          },
        },
      ],
    },

    // ─── Feature Flags ────────────────────────────────────────────────────────
    {
      name: 'features',
      type: 'group',
      label: 'Feature Flags',
      fields: [
        {
          name: 'multivendorEnabled',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description:
              'Enable marketplace mode. Also requires MULTIVENDOR_ENABLED env var. Env var takes precedence.',
          },
        },
        {
          name: 'guestCheckoutEnabled',
          type: 'checkbox',
          defaultValue: true,
        },
        {
          name: 'reviewsEnabled',
          type: 'checkbox',
          defaultValue: true,
        },
        {
          name: 'reviewRequiresApproval',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'inventoryTrackingEnabled',
          type: 'checkbox',
          defaultValue: true,
        },
        {
          name: 'socialLoginEnabled',
          type: 'checkbox',
          defaultValue: true,
        },
      ],
    },

    // ─── Currency ─────────────────────────────────────────────────────────────
    {
      name: 'currency',
      type: 'group',
      label: 'Currency Settings',
      fields: [
        {
          name: 'defaultCurrency',
          type: 'select',
          defaultValue: 'USD',
          options: [
            { label: 'US Dollar (USD)', value: 'USD' },
            { label: 'Bangladeshi Taka (BDT)', value: 'BDT' },
          ],
        },
        {
          name: 'supportedCurrencies',
          type: 'select',
          hasMany: true,
          defaultValue: ['USD', 'BDT'],
          options: [
            { label: 'US Dollar (USD)', value: 'USD' },
            { label: 'Bangladeshi Taka (BDT)', value: 'BDT' },
          ],
        },
        {
          name: 'usdToBdtRate',
          type: 'number',
          defaultValue: 110,
          admin: {
            description: 'Exchange rate: 1 USD = ? BDT. Update periodically.',
            step: 0.01,
          },
        },
        {
          name: 'lastRateUpdated',
          type: 'date',
          admin: {
            readOnly: true,
          },
        },
      ],
    },

    // ─── Multivendor Defaults ─────────────────────────────────────────────────
    {
      name: 'vendorDefaults',
      type: 'group',
      label: 'Vendor Defaults',
      admin: {
        condition: (data) => data?.features?.multivendorEnabled,
      },
      fields: [
        {
          name: 'defaultCommissionRate',
          type: 'number',
          defaultValue: 0,
          min: 0,
          max: 100,
          admin: {
            description: 'Default commission % applied to all vendors unless overridden. 0 = no commission (business sets their rate).',
            step: 0.01,
          },
        },
        {
          name: 'defaultCommissionType',
          type: 'select',
          defaultValue: 'percentage',
          options: [
            { label: 'Percentage', value: 'percentage' },
            { label: 'Flat Fee', value: 'flat' },
            { label: 'Tiered', value: 'tiered' },
          ],
        },
        {
          name: 'autoApproveVendors',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'requireKYC',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'requireProductApproval',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'payoutSchedule',
          type: 'select',
          defaultValue: 'biweekly',
          options: [
            { label: 'Weekly', value: 'weekly' },
            { label: 'Biweekly', value: 'biweekly' },
            { label: 'Monthly', value: 'monthly' },
          ],
        },
        {
          name: 'payoutHoldDays',
          type: 'number',
          defaultValue: 7,
          min: 0,
          admin: {
            description: 'Days to hold vendor earnings after order delivery before releasing for payout.',
          },
        },
      ],
    },

    // ─── Inventory ────────────────────────────────────────────────────────────
    {
      name: 'inventory',
      type: 'group',
      label: 'Inventory Settings',
      fields: [
        {
          name: 'lowStockThreshold',
          type: 'number',
          defaultValue: 10,
          admin: {
            description: 'Alert when stock falls below this number.',
          },
        },
      ],
    },

    // ─── Shipping ─────────────────────────────────────────────────────────────
    {
      name: 'shipping',
      type: 'group',
      label: 'Shipping Settings',
      fields: [
        {
          name: 'defaultModel',
          type: 'select',
          defaultValue: 'platform',
          options: [
            { label: 'Platform Managed', value: 'platform' },
            { label: 'Vendor Managed', value: 'vendor' },
            { label: 'Hybrid', value: 'hybrid' },
          ],
        },
      ],
    },
  ],
}
