import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { slugField } from '../../../fields/slug'

export const Classes: CollectionConfig = {
  slug: 'classes',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'updatedAt'],
    group: 'Ecommerce',
    description: 'Manage dynamic Product Classes (Specification Templates / Attribute Sets) for catalog facet filtering and structured PDP specs.',
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
        description: 'Class / Template name (e.g. "Power Bank", "Smartphone", "Headphones", "Laptop")',
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
      name: 'parameters',
      type: 'array',
      labels: {
        singular: 'Parameter',
        plural: 'Parameters',
      },
      admin: {
        description: 'Defined specification parameters that products in this class will inherit.',
      },
      fields: [
        {
          name: 'key',
          type: 'text',
          required: true,
          admin: {
            description: 'Unique parameter key (e.g. "capacity", "battery_type", "total_output", "ram", "storage").',
          },
        },
        {
          name: 'label',
          type: 'text',
          required: true,
          localized: true,
          admin: {
            description: 'Human-readable label (e.g. "Battery Capacity", "Total Output", "RAM").',
          },
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'text',
          options: [
            { label: 'Select (Predefined Options)', value: 'select' },
            { label: 'Text', value: 'text' },
            { label: 'Number', value: 'number' },
            { label: 'Boolean (Yes / No)', value: 'boolean' },
          ],
          admin: {
            description: 'Parameter data type. For Select, provide predefined options below for clean facet filters.',
          },
        },
        {
          name: 'options',
          type: 'array',
          labels: {
            singular: 'Option',
            plural: 'Options',
          },
          admin: {
            description: 'Allowed predefined options when type is "Select" to avoid typos and standardize filters.',
            condition: (_data, siblingData) => siblingData?.type === 'select',
          },
          fields: [
            {
              name: 'label',
              type: 'text',
              required: true,
              localized: true,
              admin: {
                description: 'Display label for this option (e.g. "Lithium Polymer", "10,000 mAh").',
              },
            },
            {
              name: 'value',
              type: 'text',
              required: true,
              admin: {
                description: 'Stored value / filter key (e.g. "lithium-polymer", "10000mah").',
              },
            },
          ],
        },
        {
          name: 'unit',
          type: 'text',
          admin: {
            description: 'Optional unit suffix (e.g. "mAh", "W", "V", "g", "GB", "inch").',
          },
        },
        {
          name: 'isFilterable',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Whether this parameter appears in storefront catalog sidebar facet filters.',
          },
        },
        {
          name: 'isRequired',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Whether this parameter is required when editing a product assigned to this class.',
          },
        },
        {
          name: 'displayOrder',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Display sort order (lower numbers appear first).',
          },
        },
      ],
    },
  ],
  timestamps: true,
}
