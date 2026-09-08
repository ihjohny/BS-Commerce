import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { slugField } from '../../../fields/slug'

export const Classes: CollectionConfig = {
  slug: 'classes',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'icon', 'updatedAt'],
    group: 'Catalog',
    description: 'Manage dynamic Product Classes (Specification Templates / Attribute Sets) composed of reusable Attributes organized into logical groups.',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
      admin: {
        description: 'Class / Template name (e.g. "Smartphone", "Laptop", "Power Bank", "Audio & Headphones")',
      },
    },
    slugField('name'),
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      admin: {
        description: 'Optional description of this product class and its specification template.',
      },
    },
    {
      name: 'icon',
      type: 'text',
      admin: {
        description: 'Optional icon identifier (e.g. "smartphone", "laptop", "battery", "headphones", "camera").',
      },
    },
    {
      name: 'groups',
      type: 'array',
      labels: {
        singular: 'Attribute Group',
        plural: 'Attribute Groups',
      },
      admin: {
        description: 'Curated specification sections (e.g. "Display & Screen", "Performance & Memory", "Battery & Charging").',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          localized: true,
          admin: {
            description: 'Group header name (e.g. "Display & Screen", "Battery & Charging", "Connectivity").',
          },
        },
        {
          name: 'displayOrder',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Section display sort order (lower numbers appear first).',
          },
        },
        {
          name: 'attributes',
          type: 'array',
          labels: {
            singular: 'Attribute Item',
            plural: 'Attribute Items',
          },
          admin: {
            description: 'Reusable global attributes included in this template group.',
          },
          fields: [
            {
              name: 'attribute',
              type: 'relationship',
              relationTo: 'attributes',
              required: true,
              admin: {
                description: 'Global attribute definition from the catalog.',
              },
            },
            {
              name: 'isRequired',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description: 'Whether this attribute must be filled in for products in this class.',
              },
            },
            {
              name: 'displayOrder',
              type: 'number',
              defaultValue: 0,
              admin: {
                description: 'Sort order of this attribute within this group.',
              },
            },
            {
              name: 'helpText',
              type: 'text',
              localized: true,
              admin: {
                description: 'Optional guidance or tooltip for admin content managers.',
              },
            },
          ],
        },
      ],
    },
  ],
  timestamps: true,
}
