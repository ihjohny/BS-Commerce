import type { CollectionConfig } from 'payload'
import { geographyReferenceRead, geographyReferenceWrite } from '../access'

export const GeoCountries: CollectionConfig = {
  slug: 'geo-countries',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'isoCode', 'isActive'],
    group: 'Geography',
    description: 'Countries. Central reference data for storefront area selection.',
  },
  access: {
    read: geographyReferenceRead,
    create: geographyReferenceWrite,
    update: geographyReferenceWrite,
    delete: geographyReferenceWrite,
  },
  fields: [
    { name: 'name', type: 'text', required: true, localized: true },
    {
      name: 'isoCode',
      type: 'text',
      required: true,
      maxLength: 3,
      admin: { description: 'ISO 3166-1 alpha-2, e.g. BD' },
    },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ],
  timestamps: true,
}
