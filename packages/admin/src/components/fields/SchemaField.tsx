import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { MediaDoc, Paginated } from '@/lib/api'
import type { FieldSchema } from '@/lib/schema'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type FieldValues = Record<string, unknown>

interface SchemaFieldProps {
  field: FieldSchema
  value: unknown
  onChange: (value: unknown) => void
  disabled?: boolean
}

/** Option list for relationship/upload selects (id + title). */
function useRelationOptions(relationTo: string | undefined, titleField = 'name') {
  return useQuery({
    queryKey: ['relation-options', relationTo],
    enabled: Boolean(relationTo),
    queryFn: async () => {
      const res = await api.get<Paginated<Record<string, unknown>>>(
        `/api/${relationTo}?limit=100&depth=0&sort=-createdAt`,
      )
      return res.docs.map((doc) => {
        const title =
          relationTo === 'media'
            ? (doc as unknown as MediaDoc).filename || (doc as unknown as MediaDoc).id
            : String(doc[titleField] ?? doc.name ?? doc.title ?? doc.username ?? doc.id)
        return { value: String(doc.id), label: title }
      })
    },
    staleTime: 30_000,
  })
}

function RelationSelect({ field, value, onChange, disabled }: SchemaFieldProps) {
  const relationTo = field.relationTo ?? ''
  const titleField = relationTo === 'categories' ? 'name' : relationTo === 'users' ? 'username' : 'name'
  const { data: options, isLoading } = useRelationOptions(relationTo, titleField)
  const id = `field-${field.name}`

  return (
    <Field>
      <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
      <Select
        value={value ? String(value) : ''}
        onValueChange={(v) => onChange(v === '' ? null : v)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={isLoading ? 'Loading…' : `Select ${field.label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">— None —</SelectItem>
          {(options ?? []).map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
    </Field>
  )
}

function GroupField({ field, value, onChange, disabled }: SchemaFieldProps) {
  const group = (value ?? {}) as FieldValues
  const setValue = (name: string, v: unknown) => onChange({ ...group, [name]: v })

  return (
    <fieldset className="rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">{field.label}</legend>
      <div className="grid gap-4">
        {(field.fields ?? []).map((sub) => (
          <SchemaField
            key={sub.name}
            field={sub}
            value={group[sub.name]}
            onChange={(v) => setValue(sub.name, v)}
            disabled={disabled}
          />
        ))}
      </div>
    </fieldset>
  )
}

export function SchemaField(props: SchemaFieldProps) {
  const { field, value, onChange, disabled } = props
  const id = `field-${field.name}`

  if (field.type === 'group') return <GroupField {...props} />
  if (field.type === 'relationship' || field.type === 'upload') return <RelationSelect {...props} />
  if (field.hidden) return null

  switch (field.type) {
    case 'textarea':
      return (
        <Field>
          <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
          <Textarea
            id={id}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            rows={4}
          />
          {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
        </Field>
      )
    case 'richtext': {
      // Lexical rich text is stored as JSON. Editing is raw-JSON for now; the
      // previous valid object is preserved when the text does not parse.
      const text = typeof value === 'string' ? value : value ? JSON.stringify(value, null, 2) : ''
      return (
        <Field>
          <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
          <Textarea id={id} rows={8} value={text} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
          <p className="text-xs text-muted-foreground">Stored as Lexical JSON. Only valid JSON changes are saved.</p>
        </Field>
      )
    }
    case 'number':
      return (
        <Field>
          <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
          <Input
            id={id}
            type="number"
            value={value === null || value === undefined ? '' : String(value)}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
            disabled={disabled}
          />
          {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
        </Field>
      )
    case 'checkbox':
      return (
        <Field orientation="horizontal">
          <Checkbox
            id={id}
            checked={Boolean(value)}
            onCheckedChange={(c) => onChange(Boolean(c))}
            disabled={disabled}
          />
          <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
        </Field>
      )
    case 'select':
      return (
        <Field>
          <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
          <Select value={String(value ?? '')} onValueChange={(v) => onChange(v || null)} disabled={disabled}>
            <SelectTrigger id={id} className="w-full">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {!field.required && <SelectItem value="">— None —</SelectItem>}
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )
    case 'date':
      return (
        <Field>
          <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
          <Input
            id={id}
            type="date"
            value={value ? String(value).slice(0, 10) : ''}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled}
          />
        </Field>
      )
    default: {
      const inputType = field.type === 'email' ? 'email' : field.type === 'password' ? 'password' : 'text'
      return (
        <Field>
          <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
          <Input
            id={id}
            type={inputType}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            autoComplete={field.type === 'password' ? 'new-password' : undefined}
          />
          {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
        </Field>
      )
    }
  }
}

/** Serialize richText textareas back into JSON objects where possible. */
export function normalizeValueForSave(field: FieldSchema, value: unknown): unknown {
  if (field.type === 'richtext' && typeof value === 'string') {
    if (!value.trim()) return null
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  if (field.type === 'group' && value && typeof value === 'object') {
    const out: FieldValues = {}
    for (const sub of field.fields ?? []) {
      out[sub.name] = normalizeValueForSave(sub, (value as FieldValues)[sub.name])
    }
    return out
  }
  return value
}
