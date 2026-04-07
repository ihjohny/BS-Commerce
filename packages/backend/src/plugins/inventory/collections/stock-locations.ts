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
      defaultColumns: multivendorEnabled ? ['name', 'code', 'tenant', 'isActive'] : ['name', 'code', 'isActive'],
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
