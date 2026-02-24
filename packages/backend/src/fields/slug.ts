import type { Field } from 'payload'

export const slugField = (sourceField: string = 'title'): Field => ({
  name: 'slug',
  type: 'text',
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description: `Auto-generated from ${sourceField}. Customize if needed.`,
  },
  hooks: {
    beforeValidate: [
      ({ value, data }) => {
        if (value) return value
        const source = data?.[sourceField] as string | undefined
        if (!source) return value
        return source
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '')
      },
    ],
  },
})
