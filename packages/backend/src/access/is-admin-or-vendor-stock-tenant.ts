import type { Access } from 'payload'

/**
 * Read access for inventory rows scoped by stock-locations.tenant.
 * Admin: all. Vendor: locations (and derived stock-levels) where location.tenant equals user.tenant.
 * Platform warehouses (tenant null): admin only.
 */
export const stockLocationTenantRead: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  if (req.user.role === 'vendor' && req.user.tenant) {
    const tid = typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user.tenant
    return {
      tenant: {
        equals: tid,
      },
    }
  }
  return false
}

/** Same tenant filter for stock-levels via nested location. */
export const stockLevelTenantRead: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  if (req.user.role === 'vendor' && req.user.tenant) {
    const tid = typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user.tenant
    return {
      'location.tenant': { equals: tid },
    } as any
  }
  return false
}
