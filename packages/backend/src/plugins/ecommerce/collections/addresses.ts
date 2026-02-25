import type { CollectionConfig } from 'payload'
import { isOwnerOrAdmin } from '../../../access/is-owner-or-admin'

export const Addresses: CollectionConfig = {
  slug: 'addresses',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'firstName', 'lastName', 'city', 'country', 'user'],
    group: 'Ecommerce',
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: isOwnerOrAdmin(),
    update: isOwnerOrAdmin(),
    delete: isOwnerOrAdmin(),
  },
  hooks: {
    beforeChange: [
      ({ data, req }) => {
        if (req.user?.role !== 'admin' && data) {
          data.user = req.user!.id
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    { name: 'label', type: 'text', required: true },
    { name: 'firstName', type: 'text', required: true },
    { name: 'lastName', type: 'text', required: true },
    { name: 'street1', type: 'text', required: true },
    { name: 'street2', type: 'text' },
    { name: 'city', type: 'text', required: true },
    { name: 'state', type: 'text' },
    { name: 'postalCode', type: 'text' },
    { name: 'country', type: 'text', required: true },
    { name: 'phone', type: 'text' },
    { name: 'isDefault', type: 'checkbox', defaultValue: false },
  ],
  timestamps: true,
}
