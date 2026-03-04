import type { Access } from 'payload'

/**
 * Allows access if admin, or if the order belongs to the current user (customer field),
 * or if vendor and the order has a sub-order for their tenant.
 * Used for Orders collection.
 */
export const isOrderOwnerOrAdmin: Access = async ({ req }) => {
  const user = req.user
  if (!user) return false
  if (user.role === 'admin') return true
  if (user.role === 'customer') {
    return { customer: { equals: user.id } } as any
  }
  if (user.role === 'vendor' && user.tenant) {
    try {
      const tenantId = typeof user.tenant === 'object' ? user.tenant.id : user.tenant
      const { docs } = await req.payload.find({
        collection: 'sub-orders',
        where: { tenant: { equals: tenantId } },
        limit: 5000,
        depth: 0,
      })
      const orderIds = [...new Set(docs.map((d) => (typeof d.parentOrder === 'object' ? d.parentOrder?.id : d.parentOrder)).filter(Boolean) as string[])]
      if (orderIds.length === 0) return false
      return { id: { in: orderIds } } as any
    } catch {
      return false
    }
  }
  return false
}
