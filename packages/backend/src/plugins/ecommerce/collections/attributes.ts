import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { slugField } from '../../../fields/slug'

export const Attributes: CollectionConfig = {
  slug: 'attributes',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'key', 'dataType', 'isFilterable', 'displayOrder'],
    group: 'Catalog',
    description: 'Manage reusable product specifications, series, features, and dynamic filter facets with predefined standardized values.',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data) return data
        const dataType = data.dataType ?? originalDoc?.dataType
        const options = data.options ?? originalDoc?.options

        if (dataType === 'select' || dataType === 'multiselect') {
          if (!Array.isArray(options) || options.length === 0) {
            throw new Error(
              `Attributes with type "${dataType === 'select' ? 'Select (Single Choice)' : 'Multi-Select'}" require at least one predefined option with a label and value. Please add options before saving.`,
            )
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
      localized: true,
      admin: {
        description: 'Display name (e.g. "Screen Refresh Rate", "Battery Capacity", "RAM", "Water Resistance", "Series")',
      },
    },
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Unique internal code (e.g. "refresh_rate", "battery_capacity", "ram", "water_resistance", "series")',
      },
    },
    slugField('label'),
    {
      name: 'dataType',
      type: 'select',
      required: true,
      defaultValue: 'select',
      index: true,
      options: [
        { label: 'Select (Predefined Options - Single Choice)', value: 'select' },
        { label: 'Multi-Select (Predefined Options - Multiple Choices)', value: 'multiselect' },
        { label: 'Text (Freeform Text)', value: 'text' },
        { label: 'Number (Numeric Value with Unit)', value: 'number' },
        { label: 'Boolean (Yes / No Toggle)', value: 'boolean' },
        { label: 'Color Swatch', value: 'color' },
      ],
      admin: {
        description: 'Data input type. Use Select or Multi-Select to provide standardized predefined values for fast one-click assignment and clean facet filters.',
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      defaultValue: 'specification',
      index: true,
      options: [
        { label: 'Technical Specification', value: 'specification' },
        { label: 'Product Series / Line', value: 'series' },
        { label: 'Feature', value: 'feature' },
        { label: 'Material & Build', value: 'material' },
        { label: 'Connectivity & Network', value: 'connectivity' },
        { label: 'Compatibility', value: 'compatibility' },
        { label: 'Certification & Durability', value: 'certification' },
        { label: 'Dimensions & Weight', value: 'dimensions' },
        { label: 'General / Miscellaneous', value: 'general' },
      ],
      admin: {
        description: 'High-level attribute category for grouping and facet classification.',
      },
    },
    {
      name: 'unit',
      type: 'text',
      admin: {
        description: 'Measurement unit suffix (e.g. "mAh", "W", "GB", "inch", "Hz", "kg", "V").',
      },
    },
    {
      name: 'defaultGroup',
      type: 'text',
      admin: {
        description: 'Default specification section group on PDP (e.g. "Display", "Performance", "Battery & Charging", "Connectivity", "General").',
      },
    },
    {
      name: 'options',
      type: 'array',
      labels: {
        singular: 'Predefined Option / Value',
        plural: 'Predefined Options / Values',
      },
      admin: {
        description: 'Standardized predefined values for one-click assignment to any product without manual typing.',
        condition: (data) => data?.dataType === 'select' || data?.dataType === 'multiselect' || data?.dataType === 'color',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          localized: true,
          admin: {
            description: 'Option label (e.g. "120Hz LTPO OLED", "IP68 Water Resistant", "16 GB", "Natural Titanium")',
          },
        },
        {
          name: 'value',
          type: 'text',
          required: true,
          admin: {
            description: 'Stored filter key/value (e.g. "120hz-ltpo-oled", "ip68", "16gb", "natural-titanium")',
          },
        },
        {
          name: 'hexColor',
          type: 'text',
          admin: {
            description: 'Optional hex color code for visual swatches (e.g. "#A2AAAD" for Silver).',
          },
        },
      ],
    },
    {
      name: 'isFilterable',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Enable catalog facet filtering for this attribute.',
      },
    },
    {
      name: 'isComparable',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Include this attribute in product comparison tables.',
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
      name: 'description',
      type: 'textarea',
      localized: true,
      admin: {
        description: 'Brief description shown on attribute or facet landing pages.',
      },
    },
  ],
  timestamps: true,
}
