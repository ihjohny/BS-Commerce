import type { CollectionConfig } from 'payload'
import { geographyReferenceRead, geographyReferenceWrite } from '../access'

const defaultTierField = {
  name: 'defaultServiceTier',
  type: 'select' as const,
  required: true,
  defaultValue: 'standard',
  options: [
    { label: 'Standard (green)', value: 'standard' },
    { label: 'Extended — extra cost/time (gray)', value: 'extended' },
    { label: 'Unserved (red)', value: 'unserved' },
  ],
  admin: {
    description:
      'Used when the customer has only selected this administrative level (e.g. state/zila), not a finer locality. Locality-level policy overrides when drill-down is used.',
  },
}

/**
 * First administrative level under a country (global: state, province, division, zila, etc.).
 */
export const GeoSubdivisions: CollectionConfig = {
  slug: 'geo-subdivisions',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'country', 'code', 'defaultServiceTier', 'isActive'],
    group: 'Geography',
    description:
      'Country subdivisions — first level below country. Examples: US state, BD zila, IN district.',
  },
  access: {
    read: geographyReferenceRead,
    create: geographyReferenceWrite,
    update: geographyReferenceWrite,
    delete: geographyReferenceWrite,
  },
  fields: [
    {
      name: 'country',
      type: 'relationship',
      relationTo: 'geo-countries',
      required: true,
      index: true,
    },
    { name: 'name', type: 'text', required: true, localized: true },
    {
      name: 'code',
      type: 'text',
      admin: { description: 'Stable code for imports (e.g. ISO subdivision, national statistics code).' },
      index: true,
    },
    defaultTierField,
    {
      name: 'extendedFeeNote',
      type: 'textarea',
      admin: { description: 'Shown for extended tier when only subdivision scope is selected.' },
    },
    {
      name: 'extendedLeadTimeNote',
      type: 'textarea',
      admin: { description: 'Extra delivery time messaging (subdivision scope).' },
    },
    {
      name: 'unservedCustomerMessage',
      type: 'textarea',
      admin: { description: 'When subdivision default tier is unserved.' },
    },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ],
  timestamps: true,
}
