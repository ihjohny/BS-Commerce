import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../access/is-admin'
import { RESERVED_STOREFRONT_ROUTE_SEGMENTS } from '../../lib/cms-reserved-route-segments'
import { slugField } from '../../fields/slug'
import { pageLayoutBlocks } from './blocks'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'status', 'updatedAt'],
    preview: (doc) => {
      const slug = doc?.slug as string | undefined
      if (!slug) return null
      const baseUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3001'
      return `${baseUrl}/en/${slug}`
    },
    group: 'Content',
  },
  access: {
    create: isAdmin,
    read: ({ req }) => {
      if (req.user?.role === 'admin') return true
      return {
        status: {
          equals: 'published',
        },
      }
    },
    update: isAdmin,
    delete: isAdmin,
  },
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    slugField('title'),
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'layout',
      type: 'blocks',
      localized: true,
      blocks: pageLayoutBlocks,
    },
    // SEO
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
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        const raw = data?.slug
        if (typeof raw === 'string' && raw.trim()) {
          const slug = raw.trim().toLowerCase()
          if (RESERVED_STOREFRONT_ROUTE_SEGMENTS.has(slug)) {
            throw new Error(
              `Slug "${raw.trim()}" is reserved for a storefront route. Use a different path (e.g. "about-us" instead of a conflicting single segment).`,
            )
          }
        }
        return data
      },
    ],
    beforeChange: [
      ({ data }) => {
        if (data.status === 'published' && !data.publishedAt) {
          return { ...data, publishedAt: new Date().toISOString() }
        }
        return data
      },
    ],
  },
}
