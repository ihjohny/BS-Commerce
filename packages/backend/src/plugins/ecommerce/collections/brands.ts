import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { slugField } from '../../../fields/slug'

export const Brands: CollectionConfig = {
  slug: 'brands',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'displayOrder', 'website', 'updatedAt'],
    group: 'Catalog',
    description: 'Manage product brands and manufacturers (logos, hero banners, websites, and official brand profiles).',
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
        description: 'Brand or manufacturer name (e.g. "Apple", "Samsung", "Dyson")',
      },
    },
    slugField('name'),
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      admin: {
        description: 'Brief description shown on brand landing pages.',
      },
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Brand or manufacturer logo / icon.',
      },
    },
    {
      name: 'bannerImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Hero banner image displayed on brand showcase pages.',
      },
    },
    {
      name: 'website',
      type: 'text',
      admin: {
        description: 'Official brand website URL (e.g. https://www.apple.com).',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Show in featured brands sections and home carousels.',
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
      name: 'meta',
      type: 'group',
      label: 'SEO',
      fields: [
        {
          name: 'title',
          type: 'text',
          localized: true,
        },
        {
          name: 'description',
          type: 'textarea',
          localized: true,
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
  ],
  timestamps: true,
}
