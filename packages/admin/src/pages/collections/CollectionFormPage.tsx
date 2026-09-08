import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'

import { api } from '@/lib/api'
import { getCollectionSchema } from '@/lib/schema'
import { SchemaField, normalizeValueForSave } from '@/components/fields/SchemaField'
import type { FieldValues } from '@/components/fields/SchemaField'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FieldGroup } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'

function buildInitialValues(): FieldValues {
  return {}
}

export function CollectionFormPage() {
  const { slug = '', id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = Boolean(id)
  const schema = getCollectionSchema(slug)

  const [values, setValues] = useState<FieldValues>(buildInitialValues)
  const [error, setError] = useState<string | null>(null)

  const docQuery = useQuery({
    queryKey: ['collection-doc', slug, id],
    enabled: Boolean(schema && isEdit),
    queryFn: () => api.get<Record<string, unknown>>(`/api/${slug}/${id}?depth=0`),
  })

  useEffect(() => {
    if (docQuery.data) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = docQuery.data
      setValues(rest as FieldValues)
    }
  }, [docQuery.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!schema) throw new Error('Missing schema')
      const payload: FieldValues = {}
      for (const field of schema.fields) {
        if (field.hidden) continue
        if (isEdit && field.createOnly) continue
        payload[field.name] = normalizeValueForSave(field, values[field.name] ?? null)
      }
      if (isEdit) {
        return api.patch(`/api/${slug}/${id}`, payload)
      }
      return api.post(`/api/${slug}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', slug] })
      queryClient.invalidateQueries({ queryKey: ['collection-doc', slug] })
      navigate(`/collections/${slug}`)
    },
  })

  const visibleFields = useMemo(
    () => (schema?.fields ?? []).filter((f) => !f.hidden && !(isEdit && f.createOnly)),
    [schema, isEdit],
  )

  if (!schema) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unknown collection</AlertTitle>
        <AlertDescription>No schema is configured for “{slug}”.</AlertDescription>
      </Alert>
    )
  }

  if (isEdit && docQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="size-6" />
      </div>
    )
  }

  if (isEdit && docQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Failed to load record</AlertTitle>
        <AlertDescription>
          {docQuery.error instanceof Error ? docQuery.error.message : 'Unknown error'}
        </AlertDescription>
      </Alert>
    )
  }

  const setValue = (name: string, v: unknown) => setValues((prev) => ({ ...prev, [name]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    for (const field of visibleFields) {
      if (field.required) {
        const v = values[field.name]
        if (v === null || v === undefined || v === '') {
          setError(`“${field.label}” is required.`)
          return
        }
      }
    }
    saveMutation.mutate()
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/collections/${slug}`)} aria-label="Back">
          <ArrowLeft />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? `Edit ${schema.title.replace(/s$/, '')}` : `New ${schema.title.replace(/s$/, '')}`}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Details' : `Create ${schema.title.replace(/s$/, '')}`}</CardTitle>
          <CardDescription>
            {isEdit ? 'Changes are saved to the backend immediately on submit.' : 'Fill the fields and submit to create.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {visibleFields.map((field) => (
                <SchemaField
                  key={field.name}
                  field={field}
                  value={values[field.name]}
                  onChange={(v) => setValue(field.name, v)}
                  disabled={saveMutation.isPending}
                />
              ))}

              {(error || saveMutation.error) && (
                <Alert variant="destructive">
                  <AlertTitle>Save failed</AlertTitle>
                  <AlertDescription>
                    {error ??
                      (saveMutation.error instanceof Error ? saveMutation.error.message : 'Unknown error')}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/collections/${slug}`)}
                  disabled={saveMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
