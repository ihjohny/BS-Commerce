import type { CollectionConfig } from 'payload'
import { geographyReferenceRead, geographyReferenceWrite } from '../access'

/**
 * Second-level areas under a subdivision (global: city, upazila, county, ward, etc.).
 * Leaf tier for delivery policy when customers drill down past subdivision-only selection.
 */
export const GeoLocalities: CollectionConfig = {
  slug: 'geo-localities',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'subdivision', 'code', 'serviceTier', 'isActive'],
    group: 'Geography',
    description:
      'Localities under a subdivision — used for precise service tier and store matching. Examples: US city, BD upazila.',
  },
  access: {
    read: geographyReferenceRead,
    create: geographyReferenceWrite,
    update: geographyReferenceWrite,
    delete: geographyReferenceWrite,
  },
  fields: [
    {
      name: 'subdivision',
      type: 'relationship',
      relationTo: 'geo-subdivisions',
      required: true,
      index: true,
    },
    { name: 'name', type: 'text', required: true, localized: true },
    {
      name: 'code',
      type: 'text',
      admin: { description: 'Optional internal or national statistics code.' },
      index: true,
    },
    {
      name: 'serviceTier',
      type: 'select',
      required: true,
      defaultValue: 'standard',
      options: [
        { label: 'Standard (green)', value: 'standard' },
        { label: 'Extended — extra cost/time (gray)', value: 'extended' },
        { label: 'Unserved (red)', value: 'unserved' },
      ],
    },
    {
      name: 'extendedFeeNote',
      type: 'textarea',
      admin: { description: 'Extra cost disclosure for extended tier.' },
    },
    {
      name: 'extendedLeadTimeNote',
      type: 'textarea',
    },
    {
      name: 'unservedCustomerMessage',
      type: 'textarea',
      admin: { description: 'Shown when this locality is unserved.' },
    },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ],
  timestamps: true,
}
