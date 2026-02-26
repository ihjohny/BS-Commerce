import type { Access } from 'payload'

/**
 * Allows access if admin, or if the order belongs to the current user (customer field),
 * or if guest and they provide order ID + guestEmail match.
 * Used for Orders collection.
 */
export const isOrderOwnerOrAdmin: Access = ({ req, id }) => {
  const user = req.user
  if (!user && !id) return false
  if (user?.role === 'admin') return true
  if (user) {
    return {
      customer: {
        equals: user.id,
      },
    }
  }
  // Guest: can only read by ID + email verification (handled at API level)
  return false
}
