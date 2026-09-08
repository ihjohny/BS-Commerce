import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  ImagePlus,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { api, assetUrl } from "@/lib/api";
import type { MediaDoc, Paginated } from "@/lib/api";
import { getCollectionSchema, docTitle } from "@/lib/schema";
import type { NormField } from "@/lib/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";

function titleFieldFor(relationTo: string): string {
  return getCollectionSchema(relationTo)?.useAsTitle ?? "name";
}

/** Options loader for a related collection with server-side search. */
function useRelationSearch(
  relationTo: string,
  search: string,
  enabled: boolean,
) {
  const tf = titleFieldFor(relationTo);
  return useQuery({
    queryKey: ["relation", relationTo, search],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "50",
        depth: "0",
        sort: `-createdAt`,
      });
      if (search) {
        params.set(`where[or][0][${tf}][like]`, search);
        params.set(`where[or][1][id][like]`, search);
      }
      const res = await api.get<Paginated<Record<string, unknown>>>(
        `/api/${relationTo}?${params.toString()}`,
      );
      return res.docs.map((doc) => ({
        value: String(doc.id),
        label: docTitle(doc, getCollectionSchema(relationTo)),
      }));
    },
    staleTime: 30_000,
  });
}

function useRelationLabel(
  relationTo: string,
  id: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["relation-label", relationTo, id],
    enabled: enabled && Boolean(id),
    queryFn: async () => {
      const doc = await api.get<Record<string, unknown>>(
        `/api/${relationTo}/${id}?depth=0`,
      );
      return docTitle(doc, getCollectionSchema(relationTo));
    },
    staleTime: 60_000,
  });
}

// ─── Relationship ───────────────────────────────────────────────────────────────

export function RelationInput(props: {
  field: NormField;
  relationTo: string | string[];
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const { field, relationTo, value, onChange, disabled } = props;

  if (Array.isArray(relationTo)) {
    return <PolymorphicRelation {...props} relationTo={relationTo} />;
  }

  const hasMany = Boolean(field.hasMany);
  const selectedIds: string[] = hasMany
    ? Array.isArray(value)
      ? value.map((v) =>
          String(
            typeof v === "object" && v ? (v as Record<string, unknown>).id : v,
          ),
        )
      : []
    : [];

  return (
    <Field>
      <FieldLabel>
        {field.label}
        {field.required ? " *" : ""}
      </FieldLabel>
      {hasMany ? (
        <div className="flex flex-col gap-2">
          {selectedIds.map((id) => (
            <SelectedChip
              key={id}
              relationTo={relationTo}
              id={id}
              onRemove={() => onChange(selectedIds.filter((s) => s !== id))}
              disabled={disabled}
            />
          ))}
          <RelationCombobox
            relationTo={relationTo}
            exclude={selectedIds}
            onSelect={(id) => onChange([...selectedIds, id])}
            placeholder="Select…"
            disabled={disabled}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <RelationCombobox
            relationTo={relationTo}
            exclude={[]}
            value={
              typeof value === "object" && value
                ? String((value as Record<string, unknown>).id)
                : value
                  ? String(value)
                  : null
            }
            onSelect={(id) => onChange(id)}
            onClear={() => onChange(null)}
            placeholder="Select…"
            disabled={disabled}
          />
        </div>
      )}
      {field.description && (
        <FieldDescription>{field.description}</FieldDescription>
      )}
    </Field>
  );
}

function SelectedChip({
  relationTo,
  id,
  onRemove,
  disabled,
}: {
  relationTo: string;
  id: string;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const { data: label } = useRelationLabel(relationTo, id, true);
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-sm">
      <span className="truncate">{label ?? id}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Remove"
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}

function RelationCombobox({
  relationTo,
  value,
  exclude,
  onSelect,
  onClear,
  placeholder,
  disabled,
}: {
  relationTo: string;
  value?: string | null;
  exclude: string[];
  onSelect: (id: string) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: options, isLoading } = useRelationSearch(
    relationTo,
    search,
    open,
  );
  const { data: label } = useRelationLabel(relationTo, value ?? null, true);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
          >
            <span className="truncate">
              {value ? (label ?? value) : (placeholder ?? "Select…")}
            </span>
            <ChevronRight className="size-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-80 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Spinner className="size-4" />
              </div>
            ) : (
              <>
                <CommandEmpty>Nothing found.</CommandEmpty>
                <CommandGroup>
                  {onClear && value && (
                    <CommandItem
                      onSelect={() => {
                        onClear();
                        setOpen(false);
                      }}
                    >
                      — None —
                    </CommandItem>
                  )}
                  {(options ?? [])
                    .filter((o) => !exclude.includes(o.value))
                    .map((o) => (
                      <CommandItem
                        key={o.value}
                        value={o.value}
                        onSelect={() => {
                          onSelect(o.value);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={
                            value === o.value ? "opacity-100" : "opacity-0"
                          }
                        />
                        {o.label}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function PolymorphicRelation({
  field,
  relationTo,
  value,
  onChange,
  disabled,
}: {
  field: NormField;
  relationTo: string[];
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  // Payload polymorphic value: { relationTo: slug, value: id }
  const current = (value ?? null) as {
    relationTo?: string;
    value?: string;
  } | null;
  const [collection, setCollection] = useState<string>(
    current?.relationTo ?? relationTo[0],
  );
  const docId = current?.value ?? null;

  return (
    <Field>
      <FieldLabel>{field.label}</FieldLabel>
      <div className="flex flex-col gap-2">
        <RelationCombobox
          relationTo={collection}
          exclude={[]}
          value={docId}
          onSelect={(id) => onChange({ relationTo: collection, value: id })}
          onClear={() => onChange(null)}
          disabled={disabled}
        />
        <div className="flex flex-wrap gap-1">
          {relationTo.map((c) => (
            <Badge
              key={c}
              variant={c === collection ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCollection(c)}
            >
              {getCollectionSchema(c)?.label ?? c}
            </Badge>
          ))}
        </div>
      </div>
    </Field>
  );
}

// ─── Upload (media picker) ─────────────────────────────────────────────────────

export function UploadInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: NormField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const relationTo =
    typeof field.relationTo === "string" ? field.relationTo : "media";
  const isMany = Boolean(field.hasMany);
  const ids: string[] = isMany
    ? Array.isArray(value)
      ? value.map((v) =>
          String(
            typeof v === "object" && v ? (v as Record<string, unknown>).id : v,
          ),
        )
      : []
    : value
      ? [
          String(
            typeof value === "object" && value
              ? (value as Record<string, unknown>).id
              : value,
          ),
        ]
      : [];

  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFiles = async (files: FileList | File[]) => {
    if (disabled) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded: string[] = [];
      for (const f of list) {
        const form = new FormData();
        form.append("file", f);
        const doc = await api.postForm<MediaDoc>(`/api/${relationTo}`, form);
        uploaded.push(doc.id);
      }
      if (isMany) onChange([...ids, ...uploaded]);
      else onChange(uploaded[uploaded.length - 1] ?? null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Field>
      <FieldLabel>
        {field.label}
        {field.required ? " *" : ""}
      </FieldLabel>
      <div
        className={`flex flex-col gap-2 rounded-lg border border-dashed p-3 transition-colors ${
          dragOver ? "border-primary bg-primary/5" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void uploadFiles(e.dataTransfer.files);
        }}
      >
        {ids.map((id) => (
          <MediaPreviewRow
            key={id}
            id={id}
            onRemove={
              isMany ? () => onChange(ids.filter((x) => x !== id)) : undefined
            }
            disabled={disabled}
          />
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <MediaPicker
            relationTo={relationTo}
            onSelect={(id) => onChange(isMany ? [...ids, id] : id)}
            disabled={disabled}
            label={isMany ? "Add media" : ids.length ? "Replace" : "Choose"}
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled || uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Spinner className="size-4" /> : <Upload />}
            Upload from device
          </Button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            multiple={isMany}
            onChange={(e) => {
              if (e.target.files) void uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        {uploadError && (
          <p className="text-xs font-medium text-destructive">{uploadError}</p>
        )}
      </div>
      {field.description && (
        <FieldDescription>{field.description}</FieldDescription>
      )}
    </Field>
  );
}

function MediaPreviewRow({
  id,
  onRemove,
  disabled,
}: {
  id: string;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const { data: doc } = useQuery({
    queryKey: ["media-doc", id],
    queryFn: () => api.get<MediaDoc>(`/api/media/${id}?depth=0`),
    staleTime: 60_000,
  });
  const src = assetUrl(doc?.sizes?.thumbnail?.url ?? doc?.url);
  const thumb = doc?.sizes?.thumbnail;
  const dims =
    thumb?.width && thumb?.height ? `${thumb.width}×${thumb.height}` : null;
  const meta = [dims, doc?.mimeType ?? null].filter(Boolean).join(" · ");
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background p-2">
      {src ? (
        <img
          src={src}
          alt={doc?.alt ?? ""}
          className="size-12 rounded object-cover"
        />
      ) : (
        <div className="flex size-12 items-center justify-center rounded bg-muted">
          <ImagePlus className="size-4 text-muted-foreground" />
        </div>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{doc?.filename ?? id}</span>
        {meta ? (
          <span className="block truncate text-xs text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </span>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8 text-destructive hover:text-destructive"
          onClick={onRemove}
          disabled={disabled}
          title="Remove"
          aria-label="Remove"
        >
          <Trash2 />
        </Button>
      )}
    </div>
  );
}

export function MediaPicker({
  relationTo,
  onSelect,
  disabled,
  label,
  size,
}: {
  relationTo: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
  label?: string;
  size?: "default" | "sm" | "xs";
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);

  const list = useQuery({
    queryKey: ["media-picker", relationTo, search, open],
    enabled: open,
    queryFn: () => {
      const tf = titleFieldFor(relationTo);
      const params = new URLSearchParams({
        limit: "24",
        depth: "0",
        sort: "-createdAt",
      });
      if (search) params.set(`where[${tf}][like]`, search);
      return api.get<Paginated<MediaDoc>>(
        `/api/${relationTo}?${params.toString()}`,
      );
    },
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      const form = new FormData();
      form.append("file", file);
      const res = await api.post<MediaDoc>(`/api/${relationTo}`, form);
      return res;
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["media-picker"] });
      onSelect(doc.id);
      setFile(null);
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <ImagePlus />
        {label ?? "Choose"}
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select media</DialogTitle>
          <DialogDescription>
            Pick an existing file or upload a new one.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Search by filename…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          {(list.data?.docs ?? []).map((doc) => {
            const src = assetUrl(doc.sizes?.thumbnail?.url ?? doc.url);
            return (
              <button
                key={doc.id}
                type="button"
                className="group overflow-hidden rounded-lg border text-left"
                onClick={() => {
                  onSelect(doc.id);
                  setOpen(false);
                }}
              >
                {src ? (
                  <img
                    src={src}
                    alt={doc.alt ?? ""}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-muted">
                    <ImagePlus className="size-6 text-muted-foreground" />
                  </div>
                )}
                <span className="block truncate px-2 py-1 text-xs">
                  {doc.filename}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Upload className="size-4" />
            <span className="truncate">
              {file ? file.name : "Upload new file"}
            </span>
            <input
              type="file"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <Button
            type="button"
            disabled={!file || upload.isPending}
            onClick={() => upload.mutate()}
          >
            {upload.isPending ? <Spinner className="size-4" /> : null}
            Upload & select
          </Button>
        </div>
        {upload.error && (
          <p className="text-sm text-destructive">
            {upload.error instanceof Error
              ? upload.error.message
              : "Upload failed"}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Purpose-built image array editor ───────────────────────────────────

type ArrayItem = Record<string, unknown>;

/** Purpose-built editor for arrays of images (single upload subfield). */
export function ImagesArrayField({
  field,
  value,
  onChange,
  disabled,
  error,
}: {
  field: NormField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
  error?: string | null;
}) {
  const items: ArrayItem[] = Array.isArray(value) ? (value as ArrayItem[]) : [];
  const sub = (field.fields ?? []).find((f) => f.type === "upload" && f.name);
  const key = sub?.name ?? "image";
  const relationTo =
    typeof sub?.relationTo === "string" ? sub.relationTo : "media";
  const baseLabel = field.label ?? "Image";
  const [openRows, setOpenRows] = useState<ReadonlySet<number>>(new Set());

  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const imageId = (item: ArrayItem): string | null => {
    const v = item[key];
    if (v === null || v === undefined || v === "") return null;
    return String(typeof v === "object" ? (v as { id: unknown }).id : v);
  };
  const addIds = (ids: string[]) => {
    onChange([...items, ...ids.map((id) => ({ [key]: id }))]);
    setOpenRows((prev) => {
      const next = new Set(prev);
      for (let i = items.length; i < items.length + ids.length; i++)
        next.add(i);
      return next;
    });
  };
  const replace = (idx: number, id: string) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, [key]: id } : it)));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };
  const toggleRow = (idx: number, open: boolean) =>
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (open) next.add(idx);
      else next.delete(idx);
      return next;
    });

  const uploadFiles = async (files: FileList | File[]) => {
    if (disabled) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    setPendingUploads(list.length);
    setUploadError(null);
    try {
      const ids: string[] = [];
      for (const f of list) {
        const form = new FormData();
        form.append("file", f);
        const doc = await api.postForm<MediaDoc>(`/api/${relationTo}`, form);
        ids.push(doc.id);
        setPendingUploads((n) => Math.max(0, n - 1));
      }
      addIds(ids);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPendingUploads(0);
    }
  };

  return (
    <Field>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FieldLabel>
          {field.label}
          {field.required ? " *" : ""}
        </FieldLabel>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || items.length === 0}
            onClick={() => setOpenRows(new Set())}
            title="Collapse all items"
          >
            <ChevronsDownUp />
            Collapse
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || items.length === 0}
            onClick={() => setOpenRows(new Set(items.map((_, i) => i)))}
            title="Expand all items"
          >
            <ChevronsUpDown />
            Expand
          </Button>
        </div>
      </div>
      <div
        className={`rounded-lg border border-dashed p-3 transition-colors ${
          dragOver ? "border-primary bg-primary/5" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void uploadFiles(e.dataTransfer.files);
        }}
      >
        {items.length === 0 && pendingUploads === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No images yet — drag &amp; drop image files here, or add them below.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item, idx) => {
              const open = openRows.has(idx);
              return (
                <Collapsible
                  key={idx}
                  open={open}
                  onOpenChange={(o) => toggleRow(idx, o)}
                  className="rounded-lg border bg-background"
                >
                  <div className="flex items-center gap-1 py-1 pl-2 pr-1">
                    <CollapsibleTrigger
                      render={
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 text-left"
                        />
                      }
                    >
                      <ChevronDown
                        className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                          open ? "" : "-rotate-90"
                        }`}
                      />
                      <Badge
                        variant="outline"
                        className="shrink-0 px-1.5 font-mono text-[10px]"
                      >
                        {`${baseLabel} ${String(idx + 1).padStart(2, "0")}`}
                      </Badge>
                    </CollapsibleTrigger>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-8"
                      title="Move up"
                      aria-label="Move up"
                      disabled={idx === 0 || disabled}
                      onClick={() => move(idx, -1)}
                    >
                      <ChevronUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-8"
                      title="Move down"
                      aria-label="Move down"
                      disabled={idx === items.length - 1 || disabled}
                      onClick={() => move(idx, 1)}
                    >
                      <ChevronDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-8 text-destructive hover:text-destructive"
                      title="Remove"
                      aria-label="Remove"
                      disabled={disabled}
                      onClick={() => remove(idx)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <CollapsibleContent>
                    <div className="border-t p-2">
                      <ImageCard
                        id={imageId(item)}
                        relationTo={relationTo}
                        disabled={disabled}
                        onReplace={(id) => replace(idx, id)}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
        {pendingUploads > 0 && (
          <p className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Spinner className="size-3.5" />
            Uploading {pendingUploads} file{pendingUploads === 1 ? "" : "s"}…
          </p>
        )}
        {uploadError && (
          <p className="mt-2 text-center text-xs font-medium text-destructive">
            {uploadError}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <MediaPicker
            relationTo={relationTo}
            onSelect={(id) => addIds([id])}
            disabled={disabled || pendingUploads > 0}
            label="Add Image"
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled || pendingUploads > 0}
            onClick={() => fileRef.current?.click()}
          >
            <Upload />
            Upload from device
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      {field.description && (
        <FieldDescription>{field.description}</FieldDescription>
      )}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </Field>
  );
}

function ImageCard({
  id,
  relationTo,
  disabled,
  onReplace,
}: {
  id: string | null;
  relationTo: string;
  disabled?: boolean;
  onReplace: (id: string) => void;
}) {
  const { data: doc, isError } = useQuery({
    queryKey: ["media-doc", id],
    queryFn: () => api.get<MediaDoc>(`/api/media/${id}?depth=0`),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
  const thumbSrc = assetUrl(doc?.sizes?.thumbnail?.url ?? doc?.url);
  const fullSrc = assetUrl(doc?.url);
  const thumb = doc?.sizes?.thumbnail;
  const dims =
    thumb?.width && thumb?.height ? `${thumb.width}×${thumb.height}` : null;
  const meta = [dims, doc?.mimeType ?? null].filter(Boolean).join(" · ");

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background p-2">
      {thumbSrc ? (
        <img
          src={thumbSrc}
          alt={doc?.alt ?? ""}
          className="size-14 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="flex size-14 shrink-0 items-center justify-center rounded bg-muted">
          <ImagePlus className="size-4 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {doc?.filename ?? (id ? `${id.slice(0, 10)}…` : "No file selected")}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {isError
            ? "Failed to load image details."
            : meta || "Metadata unavailable"}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {fullSrc && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Preview"
              aria-label="Preview"
              disabled={disabled}
              onClick={() => window.open(fullSrc, "_blank")}
            >
              <Eye />
            </Button>
          )}
          <MediaPicker
            relationTo={relationTo}
            onSelect={onReplace}
            disabled={disabled}
            label="Replace"
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}
