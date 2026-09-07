import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { slugField } from '../../../fields/slug'

export const Attributes: CollectionConfig = {
  slug: 'attributes',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'key', 'type', 'customType', 'slug', 'featured', 'displayOrder'],
    group: 'Ecommerce',
    description: 'Manage product specifications, series, features, and dynamic filter facets.',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
      localized: true,
      admin: {
        description: 'Display name (e.g. "Galaxy S24 Series", "120Hz OLED", "Active Noise Cancelling", "Titanium")',
      },
    },
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Unique internal code (e.g. "series-galaxy-s24", "spec-120hz-oled", "feature-anc")',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'specification',
      index: true,
      options: [
        { label: 'Technical Specification', value: 'specification' },
        { label: 'Product Series', value: 'series' },
        { label: 'Feature', value: 'feature' },
        { label: 'Material', value: 'material' },
        { label: 'Connectivity', value: 'connectivity' },
        { label: 'Compatibility', value: 'compatibility' },
        { label: 'Certification', value: 'certification' },
        { label: 'Custom', value: 'custom' },
      ],
      admin: {
        description: 'Attribute category type for filtering and grouping.',
      },
    },
    {
      name: 'customType',
      type: 'text',
      admin: {
        description: 'Dynamic custom type identifier (e.g. "lens-mount", "fabric-weight") when type is custom.',
        condition: (data) => data?.type === 'custom',
      },
    },
    slugField('label'),
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      admin: {
        description: 'Brief description shown on attribute or facet landing pages.',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Show in featured specifications/facets sections on the storefront.',
      },
    },
    {
      name: 'displayOrder',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Sort weight (lower numbers appear first).',
      },
    },
    {
      name: 'properties',
      type: 'array',
      labels: {
        singular: 'Dynamic Property',
        plural: 'Dynamic Properties',
      },
      admin: {
        description: 'Dynamic extensible key-value properties (e.g., unit, hexColor, wattage).',
      },
      fields: [
        {
          name: 'propertyKey',
          type: 'text',
          required: true,
          admin: {
            description: 'Property identifier (e.g. "wattage", "refreshRate", "panelType")',
          },
        },
        {
          name: 'propertyValue',
          type: 'text',
          required: true,
          admin: {
            description: 'Property value (e.g. "65W", "120Hz", "LTPO OLED")',
          },
        },
        {
          name: 'propertyType',
          type: 'select',
          defaultValue: 'text',
          options: [
            { label: 'Text', value: 'text' },
            { label: 'Number', value: 'number' },
            { label: 'Boolean', value: 'boolean' },
            { label: 'Color Hex', value: 'color' },
          ],
        },
      ],
    },
  ],
  timestamps: true,
}
