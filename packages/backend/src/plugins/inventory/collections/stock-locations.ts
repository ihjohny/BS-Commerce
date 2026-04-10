import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import {
  stockLocationTenantCreate,
  stockLocationTenantMutate,
  stockLocationTenantRead,
} from '../../../access/is-admin-or-vendor-stock-tenant'

export function createStockLocationsConfig(multivendorEnabled: boolean): CollectionConfig {
  const fields: NonNullable<CollectionConfig['fields']> = [
    { name: 'name', type: 'text', required: true },
    { name: 'code', type: 'text', required: true, unique: true },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description: 'URL-friendly identifier for public store pages (e.g. /store/dhaka-north). Leave empty for non-public warehouses.',
      },
    },
    {
      name: 'address',
      type: 'group',
      fields: [
        { name: 'street', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'state', type: 'text' },
        { name: 'country', type: 'text' },
        { name: 'postalCode', type: 'text' },
      ],
    },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
    {
      name: 'isPublicStore',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'When true, this location is a customer-facing store/outlet visible on the storefront.',
      },
    },
    {
      name: 'storeDetails',
      type: 'group',
      label: 'Store / Outlet Details',
      admin: {
        description: 'Additional fields for customer-facing stores. Only relevant when isPublicStore is true.',
        condition: (data) => Boolean(data?.isPublicStore),
      },
      fields: [
        { name: 'description', type: 'richText', localized: true },
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
        { name: 'operatingHours', type: 'text', localized: true, admin: { description: 'Display string, e.g. "Mon-Sat 9am-9pm".' } },
        {
          name: 'coverageArea',
          type: 'array',
          admin: { description: 'Postal codes, city names, or zone identifiers this store serves.' },
          fields: [
            { name: 'value', type: 'text', required: true },
          ],
        },
      ],
    },
  ]

  if (multivendorEnabled) {
    fields.splice(1, 0, {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      admin: {
        description: 'Vendor owning this warehouse. Leave empty for platform-managed warehouses.',
      },
    })
  }

  return {
    slug: 'stock-locations',
    admin: {
      useAsTitle: 'name',
      defaultColumns: multivendorEnabled
        ? ['name', 'code', 'tenant', 'isPublicStore', 'isActive']
        : ['name', 'code', 'isPublicStore', 'isActive'],
      group: 'Inventory',
    },
    access: {
      create: multivendorEnabled ? stockLocationTenantCreate : isAdmin,
      read: stockLocationTenantRead,
      update: multivendorEnabled ? stockLocationTenantMutate : isAdmin,
      delete: multivendorEnabled ? stockLocationTenantMutate : isAdmin,
    },
    hooks: multivendorEnabled
      ? {
          beforeValidate: [
            ({ req, data }) => {
              if (req.user?.role !== 'vendor' || !req.user?.tenant) return data
              const tid = typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user.tenant
              if (!tid) return data
              return { ...(data || {}), tenant: tid }
            },
          ],
        }
      : undefined,
    fields,
    timestamps: true,
  }
}

/** @deprecated use createStockLocationsConfig */
export const StockLocations = createStockLocationsConfig(false)
