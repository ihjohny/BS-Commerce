import type { Payload, Where } from 'payload'

/** Which multivendor-only admin cards to show (collections actually registered). */
export type AdminDashboardAdminUi = {
  showSubOrders: boolean
  showTenants: boolean
  showVendorApplications: boolean
}

/** Vendor cards that depend on plugins / MV split. */
export type AdminDashboardVendorUi = {
  showSubOrders: boolean
  showStockLevels: boolean
}

export type AdminDashboardStats =
  | {
      role: 'admin'
      ordersTotal: number
      subOrdersTotal: number
      tenantsTotal: number
      productsTotal: number
      pendingVendorApplications: number
      adminUi: AdminDashboardAdminUi
    }
  | {
      role: 'vendor'
      tenantId: string | null
      subOrdersTotal: number
      subOrdersOpen: number
      productsTotal: number
      stockLevelsTotal: number
      vendorUi: AdminDashboardVendorUi
    }

function collectionExists(payload: Payload, slug: string): boolean {
  return slug in (payload.collections || {})
}

async function safeCount(payload: Payload, collection: string, where?: Where): Promise<number> {
  if (!collectionExists(payload, collection)) return 0
  try {
    const { totalDocs } = await payload.count({
      collection: collection as never,
      where: (where ?? {}) as Where,
    })
    return totalDocs
  } catch {
    return 0
  }
}

function tenantIdFromUser(user: { tenant?: unknown }): string | null {
  const t = user.tenant
  if (t == null) return null
  if (typeof t === 'object' && t !== null && 'id' in t && typeof (t as { id: unknown }).id === 'string') {
    return (t as { id: string }).id
  }
  if (typeof t === 'string') return t
  return String(t)
}

/**
 * Aggregates dashboard metrics with collection access rules applied (via Payload count).
 */
export async function loadDashboardStats(
  payload: Payload,
  user: { id: string; role?: string | null; tenant?: unknown },
): Promise<AdminDashboardStats> {
  if (user.role === 'admin') {
    const [ordersTotal, subOrdersTotal, tenantsTotal, productsTotal, pendingVendorApplications] =
      await Promise.all([
        safeCount(payload, 'orders'),
        safeCount(payload, 'sub-orders'),
        safeCount(payload, 'tenants'),
        safeCount(payload, 'products'),
        safeCount(payload, 'vendor-applications', { status: { equals: 'pending' } }),
      ])
    return {
      role: 'admin',
      ordersTotal,
      subOrdersTotal,
      tenantsTotal,
      productsTotal,
      pendingVendorApplications,
      adminUi: {
        showSubOrders: collectionExists(payload, 'sub-orders'),
        showTenants: collectionExists(payload, 'tenants'),
        showVendorApplications: collectionExists(payload, 'vendor-applications'),
      },
    }
  }

  if (user.role === 'vendor') {
    const tenantId = tenantIdFromUser(user)
    const vendorUi: AdminDashboardVendorUi = {
      showSubOrders: collectionExists(payload, 'sub-orders'),
      showStockLevels: collectionExists(payload, 'stock-levels'),
    }
    if (!tenantId) {
      return {
        role: 'vendor',
        tenantId: null,
        subOrdersTotal: 0,
        subOrdersOpen: 0,
        productsTotal: 0,
        stockLevelsTotal: 0,
        vendorUi,
      }
    }

    const tenantWhere: Where = { tenant: { equals: tenantId } }
    const openStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'] as const
    const openWhere: Where = {
      and: [tenantWhere, { status: { in: [...openStatuses] } }],
    }

    const [subOrdersTotal, subOrdersOpen, productsTotal, stockLevelsTotal] = await Promise.all([
      safeCount(payload, 'sub-orders', tenantWhere),
      safeCount(payload, 'sub-orders', openWhere),
      safeCount(payload, 'products', tenantWhere),
      safeCount(payload, 'stock-levels', { 'location.tenant': { equals: tenantId } } as Where),
    ])

    return {
      role: 'vendor',
      tenantId,
      subOrdersTotal,
      subOrdersOpen,
      productsTotal,
      stockLevelsTotal,
      vendorUi,
    }
  }

  throw new Error('Dashboard stats require admin or vendor role')
}
