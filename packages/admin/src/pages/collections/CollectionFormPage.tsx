import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Braces,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  History,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { api, ApiError } from "@/lib/api";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// ─── Sectioned edit layout ───────────────────────────────────────────────────

interface SectionSpec {
  title: string;
  /** Top-level field names in render order. */
  names: string[];
  /** Field names that span the full content width. */
  full?: string[];
  collapsed?: boolean;
}

// Purpose-built grouping for the product edit view (peer reference layout);
// other collections keep the flat form.
const PRODUCT_SECTIONS: SectionSpec[] = [
  {
    title: "General",
    names: [
      "name",
      "slug",
      "description",
      "shortDescription",
      "sku",
      "productType",
      "status",
      "featured",
      "brand",
      "categories",
      "productClass",
    ],
    full: ["description", "shortDescription"],
  },
  { title: "Specifications", names: ["specifications"] },
  { title: "Tags", names: ["tags"] },
  { title: "Images", names: ["images"] },
  {
    title: "Pricing",
    names: [
      "basePrice",
      "compareAtPrice",
      "saleDisplayMode",
      "costPrice",
      "currency",
      "taxable",
    ],
  },
  { title: "Shipping", names: ["weight", "dimensions"], full: ["dimensions"] },
  { title: "Variants", names: ["hasVariants"] },
  { title: "Bundle Items", names: ["bundleItems"] },
  { title: "SEO", names: ["meta", "publishedAt"], full: ["meta"] },
  { title: "Metrics", names: ["rating", "totalReviews"] },
];

// Display-only overrides for product fields (payload is not affected).
const PRODUCT_FIELD_OVERRIDES: Record<string, Partial<NormField>> = {
  rating: {
    readOnly: true,
    description: "Average rating computed from customer reviews.",
  },
  totalReviews: {
    readOnly: true,
    description: "Total number of approved customer reviews.",
  },
};

function FormSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md py-2 text-left"
      >
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "" : "-rotate-90"
          }`}
        />
        <span className="text-sm font-semibold">{title}</span>
      </button>
      {/* Hidden (not unmounted) so in-progress input state survives collapsing. */}
      <div className={open ? "grid gap-4 pb-6" : "hidden"}>{children}</div>
    </section>
  );
}

/** Prefill create forms with schema defaults (mirrors Payload's form behavior). */
function defaultsFromFields(fields: NormField[]): FieldValues {
  const out: FieldValues = {};
  for (const f of fields) {
    if (!f.name || f.hidden) continue;
    if (f.type === "group" || f.type === "collapsible") {
      const nested = defaultsFromFields(f.fields ?? []);
      if (f.defaultValue !== undefined) out[f.name] = f.defaultValue;
      else if (Object.keys(nested).length > 0) out[f.name] = nested;
    } else if (f.type === "tabs") {
      for (const t of f.tabs ?? []) {
        if (!t.name) continue;
        const nested = defaultsFromFields(t.fields);
        if (Object.keys(nested).length > 0) out[t.name] = nested;
      }
    } else if (f.type === "array") {
      out[f.name] = [];
    } else if (f.defaultValue !== undefined) {
      out[f.name] = f.defaultValue;
    }
  }
  return out;
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function fmtDate(v: unknown): string {
  if (typeof v !== "string" || !v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  // null = untouched (defaults from section config); Set = user's open/closed state.
  const [openSections, setOpenSections] = useState<Set<string> | null>(null);
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

  // Right-rail fields: Payload admin.position === "sidebar" (e.g. product slug)
  // are excluded here; products render them inline via PRODUCT_SECTIONS.
  const mainFields = useMemo(() => fields.filter((f) => !f.sidebar), [fields]);

  // Purpose-built section layout for products; null = flat form for others.
  const sectionSpecs: SectionSpec[] | null = useMemo(() => {
    if (slug !== "products") return null;
    const known = new Set(fields.map((f) => f.name));
    return PRODUCT_SECTIONS.map((s) => ({
      ...s,
      names: s.names.filter((n) => known.has(n)),
    })).filter((s) => s.names.length > 0);
  }, [slug, fields]);

  const leftoverFields = useMemo(() => {
    if (!sectionSpecs) return [];
    const covered = new Set(sectionSpecs.flatMap((s) => s.names));
    return mainFields.filter((f) => f.name && !covered.has(f.name));
  }, [sectionSpecs, mainFields]);

  // Context-aware empty state for the Specifications array.
  const specsHint =
    slug === "products"
      ? values.productClass
        ? "No specifications are inherited from this Product Class yet. Add them manually below."
        : "Select a Product Class in Organization to inherit its specification template, or add specifications manually below."
      : undefined;

  const defaultOpenSections = useMemo(
    () =>
      new Set(
        (sectionSpecs ?? []).filter((s) => !s.collapsed).map((s) => s.title),
      ),
    [sectionSpecs],
  );
  const effectiveOpen = openSections ?? defaultOpenSections;

  const toggleSection = (t: string) =>
    setOpenSections((prev) => {
      const next = new Set(prev ?? defaultOpenSections);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  // Collapsed sections containing field errors open automatically.
  const openSectionsWithError = (keys: string[]) => {
    if (!sectionSpecs) return;
    setOpenSections((prev) => {
      const next = new Set(prev ?? defaultOpenSections);
      for (const key of keys) {
        const sec = sectionSpecs.find((s) => s.names.includes(key));
        if (sec) next.add(sec.title);
      }
      return next;
    });
  };

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
      setDirty(false);
      setFieldErrors({});
    }
  }, [docQuery.data]);

  // Prefill schema defaults on create (Payload does the same in its forms).
  useEffect(() => {
    if (!schema || isEdit) return;
    setValues((prev) =>
      Object.keys(prev).length > 0 ? prev : defaultsFromFields(schema.fields),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, isEdit]);

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
      setDirty(false);
      setFieldErrors({});
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 2500);
      if (isEdit) {
        docQuery.refetch();
      } else {
        navigate(`/collections/${slug}`);
      }
    },
    onError: (err) => {
      // Map Payload's per-field 400 errors onto the matching inputs.
      if (err instanceof ApiError && err.fieldErrors.length > 0) {
        const map: Record<string, string> = {};
        for (const fe of err.fieldErrors) {
          if (!fe.field || !fe.message) continue;
          const key = fe.field.split(".")[0];
          if (fields.some((f) => f.name === key)) map[key] ??= fe.message;
        }
        setFieldErrors(map);
        openSectionsWithError(Object.keys(map));
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

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const getQ = new URLSearchParams({ depth: "0", locale });
      if (schema?.hasLocalized) getQ.set("fallback-locale", "null");
      const doc = await api.get<Record<string, unknown>>(
        `/api/${slug}/${id}?${getQ.toString()}`,
      );
      const copy: Record<string, unknown> = { ...doc };
      for (const k of ["id", "createdAt", "updatedAt"]) delete copy[k];
      for (const f of schema?.fields ?? []) {
        if (!f.name) continue;
        if (f.type === "password") delete copy[f.name];
        else if (f.unique && typeof copy[f.name] === "string" && copy[f.name]) {
          copy[f.name] = `${copy[f.name]}-copy-${Math.random()
            .toString(36)
            .slice(2, 6)}`;
        }
      }
      const postQ = schema?.hasLocalized ? `?locale=${locale}` : "";
      return api.post<{ id: string }>(`/api/${slug}${postQ}`, copy);
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["collection", slug] });
      navigate(`/collections/${slug}/${doc.id}`);
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

  // Hooks must run unconditionally — kept above the early returns below.
  const saveRef = useRef<() => void>(() => {});

  // Ctrl/Cmd+S saves, matching Payload's edit-view shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Warn before leaving with unsaved changes (Payload does the same).
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Block in-app navigation with unsaved changes. The declarative router has
  // no useBlocker, so link clicks are intercepted at the document (capture).
  useEffect(() => {
    if (!dirty) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (a.target === "_blank" || href.startsWith("#")) return;
      if (!window.confirm("You have unsaved changes. Leave without saving?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);

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

  const setValue = (name: string, v: unknown) => {
    setValues((prev) => ({ ...prev, [name]: v }));
    setDirty(true);
    setFieldErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  /** Client-side validation; returns one message per top-level field. */
  const validateAll = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const lbl = (f: NormField) => f.label ?? f.name ?? "";
    for (const field of fields) {
      const v = values[field.name!];
      const problems: string[] = [];
      if (
        field.required &&
        (v === null ||
          v === undefined ||
          v === "" ||
          (Array.isArray(v) && v.length === 0))
      ) {
        problems.push("This field is required.");
      }
      if (
        (field.type === "richText" ||
          field.type === "richtext" ||
          field.type === "json") &&
        typeof v === "string" &&
        v.trim()
      ) {
        try {
          JSON.parse(v);
        } catch {
          problems.push("Invalid JSON.");
        }
      }
      if (field.type === "number" && typeof v === "number") {
        if (field.min !== undefined && v < field.min)
          problems.push(`Must be ${field.min} or greater.`);
        if (field.max !== undefined && v > field.max)
          problems.push(`Must be ${field.max} or less.`);
      }
      if (
        field.type === "email" &&
        typeof v === "string" &&
        v &&
        !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)
      ) {
        problems.push("Invalid email address.");
      }
      if (field.type === "array" && Array.isArray(v)) {
        for (let i = 0; i < v.length; i++) {
          for (const sub of field.fields ?? []) {
            if (!sub.name || !sub.required || sub.hidden) continue;
            const sv = (v[i] as FieldValues)?.[sub.name];
            if (
              sv === null ||
              sv === undefined ||
              sv === "" ||
              (Array.isArray(sv) && sv.length === 0)
            ) {
              problems.push(`Row ${i + 1}: “${lbl(sub)}” is required.`);
              break;
            }
          }
        }
      }
      if (problems.length > 0) errs[field.name!] = problems.join(" ");
    }
    return errs;
  };

  const handleSave = (status?: "draft" | "published") => {
    if (!(isEdit ? canUpdate : canCreate)) return;
    setFieldErrors({});
    const errs = validateAll();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      openSectionsWithError(Object.keys(errs));
      return;
    }
    saveMutation.mutate({ status });
  };

  // saveRef (declared above) is refreshed every render so the Ctrl+S
  // handler always calls the latest handleSave closure.
  saveRef.current = handleSave;

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(String(id));
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  const title = docTitle(values, schema);
  const preview = previewUrl(schema, values);

  const canSave = isEdit ? canUpdate : canCreate;
  const saveDisabled = saveMutation.isPending || (isEdit && !dirty);

  const renderField = (f: NormField, emptyHint?: string) => {
    const override =
      slug === "products" ? PRODUCT_FIELD_OVERRIDES[f.name ?? ""] : undefined;
    const field = override ? { ...f, ...override } : f;
    return (
      <SchemaField
        key={f.name}
        field={field}
        value={values[f.name!]}
        error={fieldErrors[f.name!] ?? null}
        onChange={(v) => setValue(f.name!, v)}
        disabled={saveMutation.isPending || !canSave}
        emptyHint={emptyHint}
        hideSubNames={
          slug === "products" && f.name === "bundleItems"
            ? values.hasVariants
              ? []
              : ["variant"]
            : undefined
        }
      />
    );
  };

  // Flat form for collections without a section layout.
  const formBody = (
    <div className="grid gap-4">
      {fields.map((field) => renderField(field))}
    </div>
  );

  const errorAlert =
    Object.keys(fieldErrors).length > 0 ||
    saveMutation.error ||
    duplicateMutation.error ||
    deleteMutation.error ? (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {Object.keys(fieldErrors).length > 0
            ? "Please fix the highlighted fields."
            : saveMutation.error instanceof Error
              ? saveMutation.error.message
              : duplicateMutation.error instanceof Error
                ? duplicateMutation.error.message
                : deleteMutation.error instanceof Error
                  ? deleteMutation.error.message
                  : "Unknown error"}
        </AlertDescription>
      </Alert>
    ) : null;

  const byName = (n: string) => fields.find((x) => x.name === n);
  const fld = (n: string, emptyHint?: string) => {
    const f = byName(n);
    return f ? renderField(f, emptyHint) : null;
  };

  const generalSection = (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">{fld("name")}</div>
        <div>{fld("slug")}</div>
      </div>
      {fld("description")}
      {fld("shortDescription")}
      <div className="grid gap-4 md:grid-cols-2">
        <div>{fld("sku")}</div>
        <div>{fld("productType")}</div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>{fld("status")}</div>
        <div>{fld("featured")}</div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>{fld("brand")}</div>
        <div>{fld("categories")}</div>
        <div>{fld("productClass")}</div>
      </div>
    </div>
  );

  const documentBody = (
    <div className="min-w-0">
      {sectionSpecs ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(isDrafts ? "published" : undefined);
          }}
        >
          <div className="flex flex-col divide-y">
            {sectionSpecs.map((spec) => (
              <FormSection
                key={spec.title}
                title={spec.title}
                open={effectiveOpen.has(spec.title)}
                onToggle={() => toggleSection(spec.title)}
              >
                {spec.title === "General" ? (
                  generalSection
                ) : (
                  <div className="grid gap-4">
                    {spec.names.map((n) =>
                      fld(n, n === "specifications" ? specsHint : undefined),
                    )}
                  </div>
                )}
              </FormSection>
            ))}
          </div>
        </form>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave(isDrafts ? "published" : undefined);
              }}
            >
              {formBody}
            </form>
          </CardContent>
        </Card>
      )}
      {sectionSpecs && leftoverFields.length > 0 && (
        <Card className="mt-4">
          <CardContent className="pt-4">
            <div className="grid gap-4">
              {leftoverFields.map((f) => renderField(f))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const versionsBody = (
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
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 text-xs text-muted-foreground"
        >
          <span>Collections</span>
          <ChevronRight className="size-3 shrink-0" />
          <Link
            to={`/collections/${slug}`}
            className="shrink-0 hover:text-foreground"
          >
            {schema.label}
          </Link>
          <ChevronRight className="size-3 shrink-0" />
          <span className="truncate text-foreground">
            {isEdit
              ? title || `Edit ${schema.label}`
              : `Create ${schema.label}`}
          </span>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">
            {isEdit
              ? title || `Edit ${schema.label}`
              : `Create ${schema.label}`}
          </h1>
          {isDrafts && isEdit && values._status ? (
            <Badge
              variant={values._status === "published" ? "secondary" : "outline"}
            >
              {String(values._status)}
            </Badge>
          ) : null}
          <div className="ml-auto flex flex-wrap items-center gap-2">
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
            {canSave && (
              <>
                {isDrafts && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={saveMutation.isPending}
                    onClick={() => handleSave("draft")}
                  >
                    Save draft
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={saveDisabled}
                  onClick={() => handleSave(isDrafts ? "published" : undefined)}
                >
                  {saveMutation.isPending ? (
                    <Spinner className="size-4" />
                  ) : justSaved ? (
                    <Check className="size-4" />
                  ) : null}
                  {saveMutation.isPending
                    ? "Saving…"
                    : justSaved
                      ? "Saved"
                      : isDrafts
                        ? "Publish"
                        : isEdit
                          ? "Save"
                          : "Create"}
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label="More actions">
                    <MoreHorizontal />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-44">
                {preview && (
                  <DropdownMenuItem
                    onSelect={() => window.open(preview, "_blank")}
                  >
                    <Eye />
                    Preview
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => setShowJson(true)}>
                  <Braces />
                  View JSON
                </DropdownMenuItem>
                {isEdit && (
                  <DropdownMenuItem onSelect={() => void copyId()}>
                    {copiedId ? <Check /> : <Copy />}
                    {copiedId ? "Copied!" : "Copy ID"}
                  </DropdownMenuItem>
                )}
                {isEdit && canCreate && !schema.upload && (
                  <DropdownMenuItem
                    disabled={duplicateMutation.isPending}
                    onSelect={() => duplicateMutation.mutate()}
                  >
                    <Copy />
                    Duplicate
                  </DropdownMenuItem>
                )}
                {isEdit && canDelete && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => setConfirmDelete(true)}
                  >
                    <Trash2 />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {isEdit
            ? `Last modified ${fmtDate(docQuery.data?.updatedAt)} · Created ${fmtDate(docQuery.data?.createdAt)}`
            : "New document"}
        </p>
      </div>

      {errorAlert}

      {schema.versions && isEdit ? (
        <Tabs defaultValue="document">
          <TabsList>
            <TabsTrigger value="document">Document</TabsTrigger>
            <TabsTrigger value="versions">
              <History className="size-4" />
              Versions
            </TabsTrigger>
          </TabsList>
          <TabsContent value="document">{documentBody}</TabsContent>
          <TabsContent value="versions">{versionsBody}</TabsContent>
        </Tabs>
      ) : (
        documentBody
      )}

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

      <Dialog open={showJson} onOpenChange={setShowJson}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Document JSON</DialogTitle>
            <DialogDescription>
              Current form state as JSON (client-side view).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            readOnly
            rows={18}
            spellCheck={false}
            className="font-mono text-xs"
            value={JSON.stringify(values, null, 2)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
