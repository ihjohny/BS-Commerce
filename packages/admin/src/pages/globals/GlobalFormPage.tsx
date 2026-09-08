import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'

const GLOBAL_TITLES: Record<string, string> = {
  header: 'Header',
  footer: 'Footer',
  'platform-settings': 'Platform Settings',
}

/**
 * Globals are edited as validated JSON in this phase. This preserves the exact
 * Payload document shape (including localized fields, arrays and blocks) and
 * will be replaced by generated per-global forms in a later iteration.
 */
export function GlobalFormPage() {
  const { slug = '' } = useParams()
  const queryClient = useQueryClient()

  const [text, setText] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)

  const globalQuery = useQuery({
    queryKey: ['global', slug],
    enabled: slug in GLOBAL_TITLES,
    queryFn: () => api.get<Record<string, unknown>>(`/api/globals/${slug}?depth=0`),
  })

  useEffect(() => {
    if (globalQuery.data) {
      const { createdAt: _c, updatedAt: _u, _id: _id2, globalType: _g, ...rest } = globalQuery.data
      setText(JSON.stringify(rest, null, 2))
    }
  }, [globalQuery.data])

  const saveMutation = useMutation({
    mutationFn: (payload: unknown) => api.patch(`/api/globals/${slug}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global', slug] })
      setParseError(null)
    },
  })

  if (!(slug in GLOBAL_TITLES)) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unknown global</AlertTitle>
        <AlertDescription>No global named “{slug}” is configured.</AlertDescription>
      </Alert>
    )
  }

  if (globalQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="size-6" />
      </div>
    )
  }

  if (globalQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Failed to load {GLOBAL_TITLES[slug]}</AlertTitle>
        <AlertDescription>
          {globalQuery.error instanceof Error ? globalQuery.error.message : 'Unknown error'}
        </AlertDescription>
      </Alert>
    )
  }

  const handleSave = () => {
    try {
      const payload = JSON.parse(text)
      saveMutation.mutate(payload)
    } catch {
      setParseError('Invalid JSON — fix the syntax before saving.')
    }
  }

  const dirty =
    globalQuery.data !== undefined &&
    text !==
      JSON.stringify(
        (() => {
          const { createdAt: _c, updatedAt: _u, _id: _id2, globalType: _g, ...rest } = globalQuery.data
          return rest
        })(),
        null,
        2,
      )

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{GLOBAL_TITLES[slug]}</h1>
        <p className="text-sm text-muted-foreground">
          Edited as validated JSON — the exact Payload document shape, including localized fields
          and blocks.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document</CardTitle>
          <CardDescription>
            {saveMutation.isSuccess && !dirty
              ? 'Saved.'
              : 'Changes apply on submit. Localized values live under their locale keys.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor="global-json">JSON</FieldLabel>
            <Textarea
              id="global-json"
              rows={22}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="font-mono text-xs"
              spellCheck={false}
            />
          </Field>

          {(parseError || saveMutation.error) && (
            <Alert variant="destructive">
              <AlertTitle>Save failed</AlertTitle>
              <AlertDescription>
                {parseError ??
                  (saveMutation.error instanceof Error ? saveMutation.error.message : 'Unknown error')}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saveMutation.isPending || !dirty}>
              {saveMutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
