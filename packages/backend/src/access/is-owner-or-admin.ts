import type { Access } from 'payload'

/**
 * Allows access if admin, or if the document's `user` field equals the current user.
 * Use for collections that have a user relationship (e.g. addresses).
 */
export const isOwnerOrAdmin =
  (userField = 'user'): Access =>
  ({ req }) => {
    const user = req.user
    if (!user) return false
    if (user.role === 'admin') return true
    return {
      [userField]: {
        equals: user.id,
      },
    }
  }
