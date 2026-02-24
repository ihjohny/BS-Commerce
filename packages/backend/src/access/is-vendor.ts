import type { Access } from 'payload'

export const isVendor: Access = ({ req }) => {
  return req.user?.role === 'vendor'
}
