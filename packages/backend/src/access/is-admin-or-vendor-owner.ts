import type { Access } from 'payload'

/**
 * Allows access if the user is an admin,
 * or if the user is a vendor and the document belongs to their tenant.
 * Note: Users.tenant is added in Phase 4 (multivendor plugin). Until then,
 * vendors will not match tenant-based access and this returns false for them.
 */
export const isAdminOrVendorOwner: Access = ({ req }) => {
  const user = req.user

  if (!user) return false
  if (user.role === 'admin') return true

  const userRecord = user as Record<string, any>
  if (user.role === 'vendor' && userRecord.tenant) {
    const tenantId = typeof userRecord.tenant === 'object' ? userRecord.tenant.id : userRecord.tenant
    return {
      tenant: {
        equals: tenantId,
      },
    }
  }

  return false
}
