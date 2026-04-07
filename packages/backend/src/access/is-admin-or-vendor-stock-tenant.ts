import type { Access } from 'payload'

function tenantIdFromUser(user: unknown): string | null {
  const u = user as { tenant?: unknown } | undefined
  if (!u?.tenant) return null
  return typeof u.tenant === 'object' ? String((u.tenant as { id?: unknown }).id || '') : String(u.tenant)
}

function relationId(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object') {
    const id = (value as { id?: unknown }).id
    /* c8 ignore next - defensive: relation objects without id are treated as invalid */
    return id == null ? null : String(id)
  }
  return null
}

/**
 * Read access for inventory rows scoped by stock-locations.tenant.
 * Admin: all. Vendor: locations (and derived stock-levels) where location.tenant equals user.tenant.
 * Platform warehouses (tenant null): admin only.
 */
export const stockLocationTenantRead: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  if (req.user.role === 'vendor' && req.user.tenant) {
    const tid = tenantIdFromUser(req.user)
    if (!tid) return false
    return {
      tenant: {
        equals: tid,
      },
    }
  }
  return false
}

/** Vendor can create warehouses for their own tenant (tenant gets enforced by collection hook). */
export const stockLocationTenantCreate: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  if (req.user.role === 'vendor') return !!tenantIdFromUser(req.user)
  return false
}

/** Vendor can mutate only locations in their tenant. */
export const stockLocationTenantMutate: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  if (req.user.role === 'vendor') {
    const tid = tenantIdFromUser(req.user)
    if (!tid) return false
    return { tenant: { equals: tid } }
  }
  return false
}

/** Same tenant filter for stock-levels via nested location. */
export const stockLevelTenantRead: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  if (req.user.role === 'vendor' && req.user.tenant) {
    const tid = tenantIdFromUser(req.user)
    if (!tid) return false
    return {
      'location.tenant': { equals: tid },
    } as any
  }
  return false
}

/**
 * Vendor stock-level create guard:
 * - location must belong to vendor tenant
 * - product (if provided) must belong to same tenant in multivendor mode
 */
export const stockLevelTenantCreate: Access = async ({ req, data }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  if (req.user.role !== 'vendor') return false

  const tid = tenantIdFromUser(req.user)
  if (!tid) return false

  // Payload may call create access as a preflight permission check with no data
  // (or an empty object). Allow that and enforce tenant constraints on submit.
  const createData = data as { location?: unknown; product?: unknown } | undefined
  if (!createData || typeof createData !== 'object') return true
  if (createData.location == null && createData.product == null) return true

  const locationId = relationId(createData.location)
  if (!locationId) return false

  try {
    const location = await req.payload.findByID({
      collection: 'stock-locations',
      id: locationId,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const locationTenant = relationId((location as { tenant?: unknown } | undefined)?.tenant)
    if (!locationTenant || locationTenant !== tid) return false

    const productId = relationId(createData.product)
    if (productId) {
      const product = await req.payload.findByID({
        collection: 'products',
        id: productId,
        depth: 0,
        overrideAccess: true,
        req,
      })
      const productTenant = relationId((product as { tenant?: unknown } | undefined)?.tenant)
      // In multivendor mode product should be tenant scoped; ensure vendor cannot stock foreign items.
      if (!productTenant || productTenant !== tid) return false
    }

    return true
  } catch {
    return false
  }
}
