import type { Field } from 'payload'
import { slugify } from '@bs-commerce/shared'

/** Localized fields arrive as { en, bn, ... } in hooks; API may still post a flat string. */
function stringForSlugify(sourceField: string, data: Record<string, unknown> | null | undefined): string | undefined {
  const raw = data?.[sourceField]
  if (raw == null) return undefined
  if (typeof raw === 'string') {
    return raw.trim() || undefined
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    const en = o.en
    if (typeof en === 'string' && en.trim()) return en
    const bn = o.bn
    if (typeof bn === 'string' && bn.trim()) return bn
    for (const v of Object.values(o)) {
      if (typeof v === 'string' && v.trim()) return v
    }
  }
  return undefined
}

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
      ({
        value,
        data,
      }: {
        value?: string | null
        data?: Record<string, unknown> | null
      }) => {
        if (value) return value
        const source = stringForSlugify(sourceField, data ?? undefined)
        if (!source) return value
        return slugify(source)
      },
    ],
  },
})
