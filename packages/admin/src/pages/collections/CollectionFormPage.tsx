import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Eye,
  History,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { api } from "@/lib/api";
import type { VersionListResult } from "@/lib/api";
import { getCollectionSchema, docTitle } from "@/lib/schema";
import type { NormCollection, NormField } from "@/lib/schema";
import { useAccess } from "@/contexts/AccessContext";
import { serializeForSave, SchemaField } from "@/components/fields/SchemaField";
import type { FieldValues } from "@/components/fields/SchemaField";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL ?? "";

function visibleFields(fields: NormField[]): NormField[] {
  return fields.filter((f) => !f.hidden && f.name !== "id");
}

/** Pick a storefront preview path for pages-like collections. */
function previewUrl(
  schema: NormCollection,
  values: FieldValues,
): string | null {
  if (!STOREFRONT_URL) return null;
  if (
    schema.slug === "pages" &&
    typeof values.slug === "string" &&
    values.slug
  ) {
    return `${STOREFRONT_URL}/en/${values.slug}`;
  }
  return null;
}

export function CollectionFormPage() {
  const { slug = "", id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { locale, setLocale, locales, can } = useAccess();

  const isEdit = Boolean(id) && id !== "new";
  const schema = getCollectionSchema(slug);
  const isDrafts = Boolean(schema?.versions?.drafts);

  const [values, setValues] = useState<FieldValues>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [versionPreview, setVersionPreview] = useState<Record<
    string,
    unknown
  > | null>(null);

  const canUpdate = can("collections", slug, "update");
  const canCreate = can("collections", slug, "create");
  const canDelete = can("collections", slug, "delete");
  const fields = useMemo(
    () => (schema ? visibleFields(schema.fields) : []),
    [schema],
  );

  const docQuery = useQuery({
    queryKey: ["collection-doc", slug, id, locale],
    enabled: Boolean(schema && isEdit),
    queryFn: () => {
      const params = new URLSearchParams({ depth: "0", locale });
      if (schema?.hasLocalized) params.set("fallback-locale", "null");
      return api.get<Record<string, unknown>>(
        `/api/${slug}/${id}?${params.toString()}`,
      );
    },
  });

  useEffect(() => {
    if (docQuery.data) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = docQuery.data;
      setValues(rest as FieldValues);
    }
  }, [docQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (opts: { status?: "draft" | "published" }) => {
      if (!schema) throw new Error("Missing schema");
      const payload: FieldValues = {};
      for (const field of fields) {
        payload[field.name!] = serializeForSave(
          field,
          values[field.name!] ?? null,
        );
      }
      if (isDrafts) payload._status = opts.status ?? "published";

      const qs = new URLSearchParams({ locale });
      if (isDrafts && opts.status === "draft") qs.set("draft", "true");

      if (isEdit) {
        return api.patch(`/api/${slug}/${id}?${qs.toString()}`, payload);
      }
      return api.post(`/api/${slug}?${qs.toString()}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection", slug] });
      queryClient.invalidateQueries({ queryKey: ["collection-doc", slug] });
      if (isEdit) {
        docQuery.refetch();
      } else {
        navigate(`/collections/${slug}`);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/${slug}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection", slug] });
      navigate(`/collections/${slug}`);
    },
  });

  const versionsQuery = useQuery({
    queryKey: ["versions", slug, id],
    enabled: Boolean(schema?.versions && isEdit),
    queryFn: () => {
      const params = new URLSearchParams({
        limit: "20",
        depth: "0",
        locale,
        [`where[parent][equals]`]: String(id),
        sort: "-updatedAt",
      });
      return api.get<VersionListResult>(
        `/api/${slug}/versions?${params.toString()}`,
      );
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) =>
      api.post(`/api/${slug}/versions/${versionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection-doc", slug] });
      queryClient.invalidateQueries({ queryKey: ["versions", slug] });
      setVersionPreview(null);
      docQuery.refetch();
    },
  });

  if (!schema) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unknown collection</AlertTitle>
        <AlertDescription>
          No schema is configured for “{slug}”.
        </AlertDescription>
      </Alert>
    );
  }

  if (isEdit && docQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (isEdit && docQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Failed to load record</AlertTitle>
        <AlertDescription>
          {docQuery.error instanceof Error
            ? docQuery.error.message
            : "Unknown error"}
        </AlertDescription>
      </Alert>
    );
  }

  const setValue = (name: string, v: unknown) =>
    setValues((prev) => ({ ...prev, [name]: v }));

  const validate = (): string | null => {
    for (const field of fields) {
      const v = values[field.name!];
      if (
        field.required &&
        (v === null ||
          v === undefined ||
          v === "" ||
          (Array.isArray(v) && v.length === 0))
      ) {
        return `“${field.label ?? field.name}” is required.`;
      }
      if (
        (field.type === "richtext" || field.type === "json") &&
        typeof v === "string" &&
        v.trim()
      ) {
        try {
          JSON.parse(v);
        } catch {
          return `“${field.label ?? field.name}” contains invalid JSON.`;
        }
      }
    }
    return null;
  };

  const handleSave = (status?: "draft" | "published") => {
    setValidationError(null);
    const err = validate();
    if (err) {
      setValidationError(err);
      return;
    }
    saveMutation.mutate({ status });
  };

  const title = docTitle(values, schema);
  const preview = previewUrl(schema, values);

  const formBody = (
    <div className="grid gap-4">
      {fields.map((field) => (
        <SchemaField
          key={field.name}
          field={field}
          value={values[field.name!]}
          onChange={(v) => setValue(field.name!, v)}
          disabled={
            saveMutation.isPending || (isEdit ? !canUpdate : !canCreate)
          }
        />
      ))}
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/collections/${slug}`)}
          aria-label="Back"
        >
          <ArrowLeft />
        </Button>
        <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">
          {isEdit ? title || `Edit ${schema.label}` : `Create ${schema.label}`}
        </h1>
        {isDrafts && isEdit && values._status ? (
          <Badge
            variant={values._status === "published" ? "secondary" : "outline"}
          >
            {String(values._status)}
          </Badge>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {schema.hasLocalized && locales.length > 1 && (
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
          )}
          {preview && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(preview, "_blank")}
            >
              <Eye />
              Preview
            </Button>
          )}
          {isEdit && canDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 />
              Delete
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="document">
        <TabsList>
          <TabsTrigger value="document">Document</TabsTrigger>
          {schema.versions && isEdit && (
            <TabsTrigger value="versions">
              <History className="size-4" />
              Versions
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="document">
          <Card>
            <CardContent className="pt-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave(isDrafts ? "published" : undefined);
                }}
              >
                {formBody}

                {(validationError ||
                  saveMutation.error ||
                  deleteMutation.error) && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {validationError ??
                        (saveMutation.error instanceof Error
                          ? saveMutation.error.message
                          : deleteMutation.error instanceof Error
                            ? deleteMutation.error.message
                            : "Unknown error")}
                    </AlertDescription>
                  </Alert>
                )}

                {(isEdit ? canUpdate : canCreate) && (
                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(`/collections/${slug}`)}
                      disabled={saveMutation.isPending}
                    >
                      Cancel
                    </Button>
                    {isDrafts && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={saveMutation.isPending}
                        onClick={() => handleSave("draft")}
                      >
                        {saveMutation.isPending ? "Saving…" : "Save draft"}
                      </Button>
                    )}
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending
                        ? "Saving…"
                        : isDrafts
                          ? "Publish"
                          : isEdit
                            ? "Save"
                            : "Create"}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {schema.versions && isEdit && (
          <TabsContent value="versions">
            <Card>
              <CardContent className="pt-4">
                {versionsQuery.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner className="size-5" />
                  </div>
                ) : versionsQuery.error ? (
                  <Alert variant="destructive">
                    <AlertTitle>Failed to load versions</AlertTitle>
                    <AlertDescription>
                      {versionsQuery.error instanceof Error
                        ? versionsQuery.error.message
                        : "Unknown error"}
                    </AlertDescription>
                  </Alert>
                ) : (versionsQuery.data?.docs ?? []).length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No versions yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Version</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(versionsQuery.data?.docs ?? []).map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono text-xs">
                            {v.id.slice(0, 8)}…
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                String(v.version?._status) === "published"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {String(v.version?._status ?? "draft")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Intl.DateTimeFormat("en-US", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(v.updatedAt))}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="View version"
                                onClick={() => setVersionPreview(v.version)}
                              >
                                <Pencil />
                              </Button>
                              {canUpdate && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Restore version"
                                  onClick={() => restoreMutation.mutate(v.id)}
                                  disabled={restoreMutation.isPending}
                                >
                                  <RotateCcw />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete this {schema.label.toLowerCase()}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="text-destructive"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(versionPreview)}
        onOpenChange={(o) => !o && setVersionPreview(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version preview</DialogTitle>
            <DialogDescription>
              Read-only snapshot of this version.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            readOnly
            rows={18}
            spellCheck={false}
            className="font-mono text-xs"
            value={
              versionPreview ? JSON.stringify(versionPreview, null, 2) : ""
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
