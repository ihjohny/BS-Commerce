import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { slugField } from '../../../fields/slug'

export const Attributes: CollectionConfig = {
  slug: 'attributes',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'key', 'type', 'slug', 'featured', 'displayOrder'],
    group: 'Ecommerce',
    description: 'Manage product attributes (Brands, Manufacturers, Series, Specifications, and Dynamic Properties).',
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
        description: 'Display name (e.g. "Apple", "Samsung", "Galaxy S24", "Wireless")',
      },
    },
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Unique internal code (e.g. "brand-apple", "series-galaxy-s24")',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'brand',
      index: true,
      options: [
        { label: 'Brand', value: 'brand' },
        { label: 'Manufacturer', value: 'manufacturer' },
        { label: 'Product Series', value: 'series' },
        { label: 'Material', value: 'material' },
        { label: 'Feature', value: 'feature' },
        { label: 'Custom', value: 'custom' },
      ],
      admin: {
        description: 'Attribute category type for filtering and grouping.',
      },
    },
    slugField('label'),
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      admin: {
        description: 'Brief description shown on brand/attribute landing pages.',
      },
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Brand or manufacturer logo/icon.',
      },
    },
    {
      name: 'website',
      type: 'text',
      admin: {
        description: 'Official website URL (for brands/manufacturers).',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Show in featured brands/attributes sections on the storefront.',
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
        description: 'Dynamic extensible key-value properties (e.g., countryOfOrigin, hexColor, warrantyYears).',
      },
      fields: [
        {
          name: 'propertyKey',
          type: 'text',
          required: true,
          admin: {
            description: 'Property identifier (e.g. "originCountry", "accentColor", "releaseYear")',
          },
        },
        {
          name: 'propertyValue',
          type: 'text',
          required: true,
          admin: {
            description: 'Property value (e.g. "USA", "#FF0000", "2026")',
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
