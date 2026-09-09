import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { getGlobalSchema } from "@/lib/schema";
import type { NormField } from "@/lib/schema";
import { useAccess } from "@/contexts/AccessContext";
import { serializeForSave, SchemaField } from "@/components/fields/SchemaField";
import type { FieldValues } from "@/components/fields/SchemaField";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

function visibleFields(fields: NormField[]): NormField[] {
  return fields.filter((f) => !f.hidden && f.name !== "id");
}

export function GlobalFormPage() {
  const { slug = "" } = useParams();
  const queryClient = useQueryClient();
  const { locale, setLocale, locales, can } = useAccess();
  const schema = getGlobalSchema(slug);

  const [values, setValues] = useState<FieldValues>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const canUpdate = can("globals", slug, "update");
  const fields = useMemo(
    () => (schema ? visibleFields(schema.fields) : []),
    [schema],
  );

  const globalQuery = useQuery({
    queryKey: ["global", slug, locale],
    enabled: Boolean(schema),
    queryFn: () => {
      const params = new URLSearchParams({ depth: "0", locale });
      return api.get<Record<string, unknown>>(
        `/api/globals/${slug}?${params.toString()}`,
      );
    },
  });

  useEffect(() => {
    if (globalQuery.data) {
      const {
        createdAt: _c,
        updatedAt: _u,
        _id: _i,
        globalType: _g,
        ...rest
      } = globalQuery.data;
      setValues(rest as FieldValues);
    }
  }, [globalQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: FieldValues = {};
      for (const field of fields) {
        payload[field.name!] = serializeForSave(
          field,
          values[field.name!] ?? null,
        );
      }
      return api.post(
        `/api/globals/${slug}?locale=${encodeURIComponent(locale)}`,
        payload,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global", slug] });
    },
  });

  if (!schema) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unknown global</AlertTitle>
        <AlertDescription>
          No global named “{slug}” is configured.
        </AlertDescription>
      </Alert>
    );
  }

  if (globalQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (globalQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Failed to load {schema.label}</AlertTitle>
        <AlertDescription>
          {globalQuery.error instanceof Error
            ? globalQuery.error.message
            : "Unknown error"}
        </AlertDescription>
      </Alert>
    );
  }

  const handleSave = () => {
    setValidationError(null);
    for (const field of fields) {
      const v = values[field.name!];
      if (
        field.required &&
        (v === null ||
          v === undefined ||
          v === "" ||
          (Array.isArray(v) && v.length === 0))
      ) {
        setValidationError(`“${field.label ?? field.name}” is required.`);
        return;
      }
      if (
        (field.type === "richtext" || field.type === "json") &&
        typeof v === "string" &&
        v.trim()
      ) {
        try {
          JSON.parse(v);
        } catch {
          setValidationError(
            `“${field.label ?? field.name}” contains invalid JSON.`,
          );
          return;
        }
      }
    }
    saveMutation.mutate();
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {schema.label}
          </h1>
          <p className="text-sm text-muted-foreground">Global configuration</p>
        </div>
        {schema.hasLocalized && locales.length > 1 && (
          <div className="ml-auto">
            <Select value={locale} onValueChange={(v) => v && setLocale(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locales.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-4">
            {fields.map((field) => (
              <SchemaField
                key={field.name}
                field={field}
                value={values[field.name!]}
                onChange={(v) =>
                  setValues((prev) => ({ ...prev, [field.name!]: v }))
                }
                disabled={!canUpdate || saveMutation.isPending}
              />
            ))}
          </div>

          {(validationError || saveMutation.error) && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {validationError ??
                  (saveMutation.error instanceof Error
                    ? saveMutation.error.message
                    : "Unknown error")}
              </AlertDescription>
            </Alert>
          )}

          {canUpdate && (
            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
