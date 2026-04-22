import type { Access } from 'payload'
import { isAdmin } from '../../access/is-admin'

/**
 * Central geography reference: read for any client (storefront dropdowns).
 * Mutate: admin only.
 */
export const geographyReferenceRead: Access = () => true

export const geographyReferenceWrite: Access = isAdmin

/**
 * Junction rows: admin all; vendor only where linked stock-location belongs to their tenant.
 */
export const stockLocationServiceAreaRead: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  if (req.user.role === 'vendor' && req.user.tenant) {
    const tid =
      typeof req.user.tenant === 'object'
        ? (req.user.tenant as { id: string }).id
        : String(req.user.tenant)
    return {
      stockLocation: {
        tenant: {
          equals: tid,
        },
      },
    } as never
  }
  return false
}

export const stockLocationServiceAreaCreate: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  if (req.user.role === 'vendor') return !!req.user.tenant
  return false
}

export const stockLocationServiceAreaUpdateDelete: Access = stockLocationServiceAreaRead
