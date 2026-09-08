import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronRight,
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

  return (
    <Field>
      <FieldLabel>
        {field.label}
        {field.required ? " *" : ""}
      </FieldLabel>
      <div className="flex flex-col gap-2">
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
        <MediaPicker
          relationTo={relationTo}
          onSelect={(id) => onChange(isMany ? [...ids, id] : id)}
          disabled={disabled}
          label={isMany ? "Add media" : ids.length ? "Replace" : "Choose"}
        />
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
  return (
    <div className="flex items-center gap-3 rounded-lg border p-2">
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
      <span className="min-w-0 flex-1 truncate text-sm">
        {doc?.filename ?? id}
      </span>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={disabled}
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
}: {
  relationTo: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
  label?: string;
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
