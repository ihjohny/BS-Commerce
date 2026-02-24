import type { Access } from 'payload'

/**
 * Allows access if the user is an admin,
 * or if the user is a vendor and the document belongs to their tenant.
 */
export const isAdminOrVendorOwner: Access = ({ req }) => {
  const user = req.user

  if (!user) return false
  if (user.role === 'admin') return true

  if (user.role === 'vendor' && user.tenant) {
    const tenantId = typeof user.tenant === 'object' ? user.tenant.id : user.tenant
    return {
      tenant: {
        equals: tenantId,
      },
    }
  }

  return false
}
