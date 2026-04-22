import type { Block } from 'payload'

/**
 * Composable layout blocks for marketing / legal / landing content.
 * Add new blocks here and mirror rendering in storefront `components/cms/page-layout-blocks.tsx`.
 */
export const pageLayoutBlocks: Block[] = [
  {
    slug: 'richText',
    labels: { singular: 'Rich Text', plural: 'Rich Text' },
    fields: [
      {
        name: 'content',
        type: 'richText',
      },
    ],
  },
  {
    slug: 'hero',
    labels: { singular: 'Hero', plural: 'Hero sections' },
    fields: [
      {
        name: 'heading',
        type: 'text',
        localized: true,
      },
      {
        name: 'subheading',
        type: 'textarea',
        localized: true,
      },
      {
        name: 'backgroundImage',
        type: 'upload',
        relationTo: 'media',
      },
      {
        name: 'ctaLabel',
        type: 'text',
        localized: true,
      },
      {
        name: 'ctaUrl',
        type: 'text',
      },
    ],
  },
  {
    slug: 'image',
    labels: { singular: 'Image', plural: 'Images' },
    fields: [
      {
        name: 'image',
        type: 'upload',
        relationTo: 'media',
        required: true,
      },
      {
        name: 'alt',
        type: 'text',
      },
      {
        name: 'caption',
        type: 'text',
      },
      {
        name: 'variant',
        type: 'select',
        defaultValue: 'rounded',
        options: [
          { label: 'Rounded', value: 'rounded' },
          { label: 'Full width', value: 'full' },
        ],
      },
    ],
  },
  {
    slug: 'splitSection',
    labels: { singular: 'Image + text', plural: 'Image + text' },
    fields: [
      {
        name: 'image',
        type: 'upload',
        relationTo: 'media',
        required: true,
      },
      {
        name: 'imagePosition',
        type: 'select',
        defaultValue: 'left',
        options: [
          { label: 'Image left', value: 'left' },
          { label: 'Image right', value: 'right' },
        ],
      },
      {
        name: 'body',
        type: 'richText',
      },
    ],
  },
  {
    slug: 'videoEmbed',
    labels: { singular: 'Video embed', plural: 'Video embeds' },
    fields: [
      {
        name: 'title',
        type: 'text',
      },
      {
        name: 'embedUrl',
        type: 'text',
        required: true,
        admin: {
          description: 'YouTube or Vimeo watch/embed URL',
        },
      },
    ],
  },
  {
    slug: 'faq',
    labels: { singular: 'FAQ', plural: 'FAQs' },
    fields: [
      {
        name: 'heading',
        type: 'text',
      },
      {
        name: 'items',
        type: 'array',
        labels: { singular: 'Item', plural: 'Items' },
        fields: [
          {
            name: 'question',
            type: 'text',
            required: true,
          },
          {
            name: 'answer',
            type: 'richText',
            required: true,
          },
        ],
      },
    ],
  },
  {
    slug: 'callout',
    labels: { singular: 'Callout', plural: 'Callouts' },
    fields: [
      {
        name: 'tone',
        type: 'select',
        defaultValue: 'muted',
        options: [
          { label: 'Muted', value: 'muted' },
          { label: 'Primary', value: 'primary' },
          { label: 'Warning', value: 'warning' },
        ],
      },
      {
        name: 'content',
        type: 'richText',
      },
    ],
  },
  {
    slug: 'spacer',
    labels: { singular: 'Spacer', plural: 'Spacers' },
    fields: [
      {
        name: 'size',
        type: 'select',
        defaultValue: 'md',
        options: [
          { label: 'Small', value: 'sm' },
          { label: 'Medium', value: 'md' },
          { label: 'Large', value: 'lg' },
        ],
      },
    ],
  },
]
