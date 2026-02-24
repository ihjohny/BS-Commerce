import type { Access } from 'payload'

export const isCustomer: Access = ({ req }) => {
  return req.user?.role === 'customer'
}
