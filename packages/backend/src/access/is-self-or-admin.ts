import type { Access } from 'payload'

/**
 * Allows access if the user is an admin,
 * or if the user is accessing their own document.
 */
export const isSelfOrAdmin: Access = ({ req }) => {
  const user = req.user

  if (!user) return false
  if (user.role === 'admin') return true

  return {
    id: {
      equals: user.id,
    },
  }
}
