import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Copy,
  ListFilter,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { api, assetUrl } from "@/lib/api";
import type { Paginated } from "@/lib/api";
import { docTitle, getCollectionSchema } from "@/lib/schema";
import type { NormCollection, NormField } from "@/lib/schema";
import { useAccess } from "@/contexts/AccessContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function prettifyColumn(col: string): string {
  return col
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(s);
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) return value.map(cellText).join(", ");
  if (typeof value === "object") {
    const doc = value as Record<string, unknown>;
    for (const key of [
      "name",
      "title",
      "username",
      "email",
      "filename",
      "code",
      "label",
    ]) {
      if (typeof doc[key] === "string") return doc[key] as string;
    }
    if (doc.id) return String(doc.id);
  }
  return String(value);
}

/** Image URL of a populated upload doc (handles polymorphic {relationTo, value}). */
function thumbUrl(value: unknown): string | null {
  let doc = value as Record<string, unknown> | null | undefined;
  if (doc && typeof doc === "object" && "relationTo" in doc && "value" in doc) {
    doc = doc.value as Record<string, unknown>;
  }
  if (!doc || typeof doc !== "object") return null;
  if (typeof doc.url !== "string") return null;
  const mime = typeof doc.mimeType === "string" ? doc.mimeType : "";
  if (mime) return mime.startsWith("image/") ? doc.url : null;
  return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(doc.url) ? doc.url : null;
}

function optionLabel(field: NormField | undefined, value: string): string {
  const opt = field?.options?.find((o) => o.value === value);
  return opt?.label ?? value;
}

function CellValue({
  value,
  col,
  field,
  docThumb,
  selfHref,
  relation,
}: {
  value: unknown;
  col: string;
  field?: NormField;
  docThumb?: string | null;
  /** Link target of the row's own edit page (primary title column). */
  selfHref?: string;
  /** Set for scalar relationship/upload columns: target slug + its schema. */
  relation?: { relationTo: string; schema?: NormCollection };
}) {
  if (value === null || value === undefined || value === "")
    return <span className="text-muted-foreground">—</span>;

  if (col === "_status") {
    const s = String(value);
    return (
      <Badge variant={s === "published" ? "secondary" : "outline"}>{s}</Badge>
    );
  }

  // Scalar relationship / upload → link to the related doc's edit page.
  if (relation) {
    if (value && typeof value === "object") {
      const relDoc = value as Record<string, unknown>;
      const relId =
        relDoc.id !== undefined && relDoc.id !== null ? String(relDoc.id) : "";
      const thumb = thumbUrl(value);
      const content = thumb ? (
        <span className="flex items-center gap-2">
          <img
            src={assetUrl(thumb)}
            alt=""
            loading="lazy"
            className="size-8 shrink-0 rounded border object-cover"
          />
          <span className="truncate">{docTitle(relDoc, relation.schema)}</span>
        </span>
      ) : (
        <span className="truncate">{docTitle(relDoc, relation.schema)}</span>
      );
      if (!relId) return content;
      return (
        <Link
          to={`/collections/${relation.relationTo}/${relId}`}
          className="block max-w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </Link>
      );
    }
    // Depth data missing → fall back to the raw id string.
    return <span className="truncate">{cellText(value)}</span>;
  }

  let inner: React.ReactNode;
  if (typeof value === "boolean") {
    inner = value ? "Yes" : "No";
  } else if (
    typeof value === "string" &&
    (field?.type === "select" || field?.type === "radio")
  ) {
    inner = <Badge variant="secondary">{optionLabel(field, value)}</Badge>;
  } else if (Array.isArray(value)) {
    if (value.length === 0)
      return <span className="text-muted-foreground">—</span>;
    inner = (
      <span>
        {value.length === 1 ? cellText(value[0]) : `${value.length} items`}
      </span>
    );
  } else if (typeof value === "object") {
    // Populated relationship / upload (depth=1) → thumbnail when it is an image.
    const thumb = docThumb ?? thumbUrl(value);
    if (thumb) {
      inner = (
        <span className="flex items-center gap-2">
          <img
            src={assetUrl(thumb)}
            alt=""
            loading="lazy"
            className="size-8 shrink-0 rounded border object-cover"
          />
          <span className="truncate">{cellText(value)}</span>
        </span>
      );
    } else {
      inner = <span className="truncate">{cellText(value)}</span>;
    }
  } else {
    const s = String(value);
    if (isIsoDate(s)) {
      inner = (
        <span>
          {new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(s))}
        </span>
      );
    } else {
      inner = <span className="truncate">{s}</span>;
    }
  }

  // Primary title column → link to the row's own edit page.
  if (selfHref) {
    return (
      <Link
        to={selfHref}
        className="block max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

// ─── Filter operators (Payload REST where operators) ───────────────────────────

type OpEntry = [op: string, label: string];

const OPERATORS_BY_TYPE: Record<string, OpEntry[]> = {
  text: [
    ["equals", "equals"],
    ["not_equals", "not equals"],
    ["like", "contains"],
    ["not_like", "does not contain"],
    ["in", "is in"],
    ["not_in", "is not in"],
    ["exists", "exists"],
  ],
  number: [
    ["equals", "equals"],
    ["not_equals", "not equals"],
    ["greater_than", "greater than"],
    ["greater_than_equal", "greater than or equal"],
    ["less_than", "less than"],
    ["less_than_equal", "less than or equal"],
    ["in", "is in"],
    ["not_in", "is not in"],
    ["exists", "exists"],
  ],
  select: [
    ["equals", "equals"],
    ["not_equals", "not equals"],
    ["in", "is in"],
    ["not_in", "is not in"],
    ["exists", "exists"],
  ],
  checkbox: [
    ["equals", "equals"],
    ["exists", "exists"],
  ],
  date: [
    ["equals", "equals"],
    ["not_equals", "not equals"],
    ["greater_than", "after"],
    ["greater_than_equal", "on or after"],
    ["less_than", "before"],
    ["less_than_equal", "on or before"],
    ["exists", "exists"],
  ],
  relationship: [
    ["equals", "equals"],
    ["not_equals", "not equals"],
    ["in", "is in"],
    ["not_in", "is not in"],
    ["exists", "exists"],
  ],
};

OPERATORS_BY_TYPE.upload = OPERATORS_BY_TYPE.relationship;

function normalizeFilterType(type: string | undefined): string {
  if (type === "textarea" || type === "email") return "text";
  if (type === "radio") return "select";
  return type ?? "";
}

function opsForType(type: string | undefined): OpEntry[] {
  return OPERATORS_BY_TYPE[normalizeFilterType(type)] ?? [];
}

function coerceFilterValue(op: string, type: string, value: string): unknown {
  if (op === "exists") return value === "true";
  if (type === "checkbox") return value === "true";
  if (type === "number") {
    if (op === "in" || op === "not_in")
      return value
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !Number.isNaN(n));
    return Number(value);
  }
  if (op === "in" || op === "not_in")
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  return value;
}

interface FilterRule {
  field: string;
  op: string;
  value: string;
}

const STATUS_OPTIONS = [
  { label: "published", value: "published" },
  { label: "draft", value: "draft" },
];

const COLS_KEY_PREFIX = "admin-list-cols-";

const PAGE_LIMITS = [10, 20, 50];

export function CollectionListPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const schema = getCollectionSchema(slug);
  const { locale, can } = useAccess();

  // ── List state lives in the URL so it survives reloads and back-nav ────────
  const search = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const rawLimit = Number(searchParams.get("limit"));
  const perPage = PAGE_LIMITS.includes(rawLimit) ? rawLimit : 10;
  const sort = searchParams.get("sort") || "-createdAt";
  const statusFilter = searchParams.get("status") ?? "all";
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("q") ?? "",
  );
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [addFilterOpen, setAddFilterOpen] = useState(false);
  const [filterField, setFilterField] = useState("");
  const [filterOp, setFilterOp] = useState("equals");
  const [filterValue, setFilterValue] = useState("");

  const isDrafts = Boolean(schema?.versions?.drafts);

  // ── Columns: defaults first, then every top-level field, meta columns last ──
  const candidateColumns = useMemo(() => {
    if (!schema) return [];
    const out: string[] = [];
    const push = (c?: string) => {
      if (c && !out.includes(c)) out.push(c);
    };
    for (const c of schema.defaultColumns ?? []) push(c);
    for (const f of schema.fields) {
      if (!f.name) continue;
      if (["collapsible", "tabs", "blocks", "ui", "array"].includes(f.type))
        continue;
      push(f.name);
    }
    if (schema.timestamps) {
      push("createdAt");
      push("updatedAt");
    }
    if (isDrafts) push("_status");
    push("id");
    return out;
  }, [schema, isDrafts]);

  const defaultVisible = useMemo(() => {
    const base = (
      schema?.defaultColumns?.length
        ? schema.defaultColumns
        : [schema?.useAsTitle ?? "id"]
    ).filter(Boolean) as string[];
    if (isDrafts && !base.includes("_status")) base.push("_status");
    return base;
  }, [schema, isDrafts]);

  const colsKey = `${COLS_KEY_PREFIX}${slug}`;

  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`${COLS_KEY_PREFIX}${slug}`);
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch {
      // ignore malformed storage
    }
    return new Set(defaultVisible);
  });

  // Reset per-collection local state when switching collections (same route).
  useEffect(() => {
    setFilters([]);
    setSelected(new Set());
    setBulkConfirm(false);
    setAddFilterOpen(false);
    setFilterField("");
    setFilterOp("equals");
    setFilterValue("");
    let next = new Set(defaultVisible);
    try {
      const raw = localStorage.getItem(`${COLS_KEY_PREFIX}${slug}`);
      if (raw) next = new Set(JSON.parse(raw) as string[]);
    } catch {
      // ignore malformed storage
    }
    setVisibleCols(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Keep the search input in sync with ?q= (deep links, back-nav).
  useEffect(() => {
    setSearchInput(searchParams.get("q") ?? "");
  }, [searchParams]);

  const toggleColumn = (col: string, on: boolean) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (on) next.add(col);
      else next.delete(col);
      try {
        localStorage.setItem(colsKey, JSON.stringify([...next]));
      } catch {
        // storage may be unavailable
      }
      return next;
    });
  };

  const activeColumns = useMemo(() => {
    const cols = candidateColumns.filter((c) => visibleCols.has(c));
    return cols.length > 0 ? cols : [schema?.useAsTitle ?? "id"];
  }, [candidateColumns, visibleCols, schema]);

  const fieldMap = useMemo(() => {
    const m = new Map<string, NormField>();
    for (const f of schema?.fields ?? []) {
      if (f.name) m.set(f.name, f);
    }
    return m;
  }, [schema]);

  const effType = (col: string): string =>
    col === "_status" ? "select" : normalizeFilterType(fieldMap.get(col)?.type);

  const filterableColumns = useMemo(
    () => candidateColumns.filter((c) => opsForType(effType(c)).length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candidateColumns, fieldMap],
  );

  // ── Status field that ?status= targets: `_status` for drafts collections,
  // else a dedicated `status` select field when the collection has one ────────
  const statusFieldName = useMemo(() => {
    if (!schema) return null;
    if (isDrafts) return "_status";
    return schema.fields.some((f) => f.name === "status" && f.type === "select")
      ? "status"
      : null;
  }, [schema, isDrafts]);

  /** Validated ?status= value (null when absent or not a known option). */
  const statusValue = useMemo(() => {
    if (statusFilter === "all" || !statusFieldName) return null;
    const opts =
      statusFieldName === "_status"
        ? STATUS_OPTIONS
        : (fieldMap.get("status")?.options ?? []);
    return opts.some((o) => o.value === statusFilter) ? statusFilter : null;
  }, [statusFilter, statusFieldName, fieldMap]);

  // ── Payload-style where clause from search + status + filters ────────────────
  const whereParam = useMemo(() => {
    const and: Array<Record<string, unknown>> = [];
    if (search) {
      const tf = schema?.useAsTitle ?? "id";
      const or: Array<Record<string, unknown>> = [];
      if (tf !== "id") or.push({ [tf]: { like: search } });
      or.push({ id: { like: search } });
      and.push({ or });
    }
    if (statusValue && statusFieldName)
      and.push({ [statusFieldName]: { equals: statusValue } });
    for (const f of filters) {
      and.push({
        [f.field]: {
          [f.op]: coerceFilterValue(f.op, effType(f.field), f.value),
        },
      });
    }
    if (and.length === 0) return "";
    return `&where=${encodeURIComponent(JSON.stringify({ and }))}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusValue, statusFieldName, filters, schema, fieldMap]);

  const listQuery = useQuery({
    queryKey: ["collection", slug, page, perPage, sort, locale, whereParam],
    enabled: Boolean(schema),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("limit", String(perPage));
      params.set("page", String(page));
      params.set("depth", "1");
      params.set("sort", sort);
      params.set("locale", locale);
      if (isDrafts && !statusValue) params.set("draft", "true");
      return api.get<Paginated<Record<string, unknown>>>(
        `/api/${slug}?${params.toString()}${whereParam}`,
      );
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["collection", slug] });

  const deleteMany = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected);
      const where = encodeURIComponent(JSON.stringify({ id: { in: ids } }));
      return api.delete(`/api/${slug}?where=${where}`);
    },
    onSuccess: () => {
      setSelected(new Set());
      setBulkConfirm(false);
      invalidate();
    },
  });

  const canUpdate = can("collections", slug, "update");

  const setStatusMany = useMutation({
    mutationFn: async (_status: string) => {
      const q = schema?.hasLocalized ? `?locale=${locale}` : "";
      await Promise.all(
        Array.from(selected).map((id) =>
          api.patch(`/api/${slug}/${id}${q}`, { _status }),
        ),
      );
    },
    onSuccess: () => {
      setSelected(new Set());
      invalidate();
    },
  });

  const duplicateDoc = useMutation({
    mutationFn: async (id: string) => {
      const getQ = new URLSearchParams({ depth: "0" });
      if (schema?.hasLocalized) {
        getQ.set("locale", locale);
      }
      const doc = await api.get<Record<string, unknown>>(
        `/api/${slug}/${id}?${getQ.toString()}`,
      );
      const copy: Record<string, unknown> = { ...doc };
      for (const k of ["id", "createdAt", "updatedAt"]) delete copy[k];
      for (const f of schema?.fields ?? []) {
        if (!f.name) continue;
        if (f.type === "password") delete copy[f.name];
        else if (f.unique && typeof copy[f.name] === "string" && copy[f.name]) {
          copy[f.name] =
            `${copy[f.name]}-copy-${Math.random().toString(36).slice(2, 6)}`;
        }
      }
      const postQ = schema?.hasLocalized ? `?locale=${locale}` : "";
      return api.post<{ id: string }>(`/api/${slug}${postQ}`, copy);
    },
    onSuccess: () => invalidate(),
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

  const docs = listQuery.data?.docs ?? [];
  const totalDocs = listQuery.data?.totalDocs ?? 0;
  const allOnPageSelected =
    docs.length > 0 && docs.every((d) => selected.has(String(d.id)));

  const toggleAll = () => {
    if (allOnPageSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(docs.map((d) => String(d.id))));
    }
  };

  /** Merge updates into the URL search params; a null value removes the key. */
  const updateParams = (updates: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      return next;
    });
  };

  const goToPage = (p: number) =>
    updateParams({ page: p > 1 ? String(p) : null });

  const toggleSort = (col: string) => {
    updateParams({ sort: sort === col ? `-${col}` : col, page: null });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: searchInput.trim() || null, page: null });
  };

  const pickFilterField = (col: string) => {
    setFilterField(col);
    const type = effType(col);
    const ops = opsForType(type);
    setFilterOp(
      ops.some(([op]) => op === "equals")
        ? "equals"
        : (ops[0]?.[0] ?? "equals"),
    );
    if (type === "select") {
      const opts =
        col === "_status"
          ? STATUS_OPTIONS
          : (fieldMap.get(col)?.options ?? []).filter((o) => o.value !== "");
      setFilterValue(opts[0]?.value ?? "");
    } else {
      setFilterValue("");
    }
  };

  const applyFilter = () => {
    if (!filterField) return;
    if (filterOp !== "exists" && filterValue === "") return;
    setFilters((prev) => [
      ...prev,
      { field: filterField, op: filterOp, value: filterValue },
    ]);
    setFilterValue("");
    setAddFilterOpen(false);
    updateParams({ page: null });
  };

  const mutationError =
    deleteMany.error ?? setStatusMany.error ?? duplicateDoc.error ?? null;

  const canCreate = can("collections", slug, "create");
  const canDelete = can("collections", slug, "delete");
  const label = schema.label;

  const filterValueEditor = (() => {
    const type = effType(filterField);
    if (filterOp === "exists" || type === "checkbox") {
      return (
        <Select
          value={filterValue || "true"}
          onValueChange={(v) => v && setFilterValue(v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    if (
      type === "select" &&
      (filterOp === "equals" || filterOp === "not_equals")
    ) {
      const opts =
        filterField === "_status"
          ? STATUS_OPTIONS
          : (fieldMap.get(filterField)?.options ?? []).filter(
              (o) => o.value !== "",
            );
      return (
        <Select
          value={filterValue}
          onValueChange={(v) => v && setFilterValue(v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {opts.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (type === "number")
      return (
        <Input
          type="number"
          value={filterValue}
          onChange={(e) => setFilterValue(e.target.value)}
          placeholder="Value"
        />
      );
    if (type === "date")
      return (
        <Input
          type="datetime-local"
          value={filterValue}
          onChange={(e) => setFilterValue(e.target.value)}
        />
      );
    return (
      <Input
        value={filterValue}
        onChange={(e) => setFilterValue(e.target.value)}
        placeholder={
          filterOp === "in" || filterOp === "not_in"
            ? "Comma separated values"
            : type === "relationship" || type === "upload"
              ? "Related ID"
              : "Value"
        }
      />
    );
  })();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{label}</h1>
          {listQuery.data && (
            <p className="text-sm text-muted-foreground">
              {listQuery.data.totalDocs} total
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && isDrafts && canUpdate && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={setStatusMany.isPending}
                onClick={() => setStatusMany.mutate("draft")}
              >
                Unpublish
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={setStatusMany.isPending}
                onClick={() => setStatusMany.mutate("published")}
              >
                Publish
              </Button>
            </>
          )}
          {selected.size > 0 && canDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkConfirm(true)}
            >
              <Trash2 />
              Delete ({selected.size})
            </Button>
          )}
          {canCreate && (
            <Button
              size="sm"
              onClick={() => navigate(`/collections/${slug}/new`)}
            >
              <Plus />
              Create new
            </Button>
          )}
        </div>
      </div>

      {mutationError instanceof Error && (
        <Alert variant="destructive">
          <AlertTitle>Request failed</AlertTitle>
          <AlertDescription>{mutationError.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <form onSubmit={handleSearch} className="w-full max-w-xs">
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  placeholder={`Search ${label.toLowerCase()}…`}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label={`Search ${label}`}
                />
              </InputGroup>
            </form>

            <Popover>
              <PopoverTrigger
                render={
                  <Button variant="outline" size="sm">
                    <Columns3 />
                    Columns
                  </Button>
                }
              />
              <PopoverContent className="w-56 p-2" align="start">
                <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                  {candidateColumns.map((col) => (
                    <label
                      key={col}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                    >
                      <Checkbox
                        checked={visibleCols.has(col)}
                        onCheckedChange={(c) => toggleColumn(col, Boolean(c))}
                      />
                      {prettifyColumn(col)}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={addFilterOpen} onOpenChange={setAddFilterOpen}>
              <PopoverTrigger
                render={
                  <Button variant="outline" size="sm">
                    <ListFilter />
                    Filters
                    {filters.length > 0 && (
                      <Badge variant="secondary">{filters.length}</Badge>
                    )}
                  </Button>
                }
              />
              <PopoverContent className="w-72 p-3" align="start">
                <div className="flex flex-col gap-2">
                  <Select
                    value={filterField}
                    onValueChange={(v) => v && pickFilterField(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Field" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterableColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {prettifyColumn(col)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filterField && (
                    <>
                      <Select
                        value={filterOp}
                        onValueChange={(v) => v && setFilterOp(v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {opsForType(effType(filterField)).map(([op, lbl]) => (
                            <SelectItem key={op} value={op}>
                              {lbl}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {filterValueEditor}
                      <Button size="sm" onClick={applyFilter}>
                        Apply filter
                      </Button>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {isDrafts && (
              <Select
                value={statusValue ?? "all"}
                onValueChange={(v) => {
                  updateParams({
                    status: !v || v === "all" ? null : v,
                    page: null,
                  });
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {filters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {filters.map((f, i) => (
                <Badge key={`${f.field}-${f.op}-${i}`} variant="outline">
                  {prettifyColumn(f.field)} {f.op.replace(/_/g, " ")}{" "}
                  {f.op === "exists" ? "" : f.value}
                  <button
                    type="button"
                    aria-label="Remove filter"
                    className="ml-1 rounded hover:text-destructive"
                    onClick={() => {
                      setFilters((prev) => prev.filter((_, j) => j !== i));
                      updateParams({ page: null });
                    }}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  setFilters([]);
                  updateParams({ page: null });
                }}
              >
                Clear all
              </Button>
            </div>
          )}
          {!isDrafts && statusValue && (
            <div className="flex flex-wrap items-center gap-1">
              <Badge variant="outline">
                Filtered by status:{" "}
                {optionLabel(fieldMap.get("status"), statusValue)}
                <button
                  type="button"
                  aria-label="Remove status filter"
                  className="ml-1 rounded hover:text-destructive"
                  onClick={() => updateParams({ status: null, page: null })}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </div>
          )}

          {listQuery.isLoading ? (
            <div className="flex flex-col gap-2 pb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : listQuery.error ? (
            <Alert variant="destructive">
              <AlertTitle>Failed to load {label}</AlertTitle>
              <AlertDescription>
                {listQuery.error instanceof Error
                  ? listQuery.error.message
                  : "Unknown error"}
              </AlertDescription>
            </Alert>
          ) : docs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {search || filters.length > 0 || statusValue
                ? "No results for this search or filters."
                : `No ${label.toLowerCase()} yet.`}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {(canDelete || canCreate) && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allOnPageSelected}
                          onCheckedChange={toggleAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                    )}
                    {activeColumns.map((col) => (
                      <TableHead key={col} onClick={() => toggleSort(col)}>
                        <span className="inline-flex cursor-pointer items-center gap-1">
                          {prettifyColumn(col)}
                          {sort === col && <ArrowUp className="size-3" />}
                          {sort === `-${col}` && (
                            <ArrowDown className="size-3" />
                          )}
                        </span>
                      </TableHead>
                    ))}
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((doc) => {
                    const id = String(doc.id);
                    const isUploadDoc = schema.upload;
                    const docThumb = isUploadDoc ? thumbUrl(doc) : null;
                    return (
                      <TableRow
                        key={id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/collections/${slug}/${id}`)}
                      >
                        {canDelete && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selected.has(id)}
                              onCheckedChange={(c) => {
                                const next = new Set(selected);
                                if (c) next.add(id);
                                else next.delete(id);
                                setSelected(next);
                              }}
                              aria-label="Select row"
                            />
                          </TableCell>
                        )}
                        {activeColumns.map((col) => {
                          const field = fieldMap.get(col);
                          let selfHref: string | undefined;
                          let relation:
                            | { relationTo: string; schema?: NormCollection }
                            | undefined;
                          if (col === (schema.useAsTitle || "id")) {
                            selfHref = `/collections/${slug}/${id}`;
                          } else if (
                            field &&
                            !field.hasMany &&
                            typeof field.relationTo === "string" &&
                            (field.type === "relationship" ||
                              field.type === "upload")
                          ) {
                            relation = {
                              relationTo: field.relationTo,
                              schema: getCollectionSchema(field.relationTo),
                            };
                          }
                          return (
                            <TableCell key={col} className="max-w-56 truncate">
                              <CellValue
                                value={doc[col]}
                                col={col}
                                field={field}
                                docThumb={
                                  col === "filename" ? docThumb : undefined
                                }
                                selfHref={selfHref}
                                relation={relation}
                              />
                            </TableCell>
                          );
                        })}
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {canCreate && !isUploadDoc && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={duplicateDoc.isPending}
                                onClick={() => duplicateDoc.mutate(id)}
                                aria-label="Duplicate"
                              >
                                <Copy />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  setSelected(new Set([id]));
                                  setBulkConfirm(true);
                                }}
                                aria-label="Delete"
                              >
                                <Trash2 />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {listQuery.data && (
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                  <span className="text-sm text-muted-foreground">
                    {totalDocs === 0
                      ? "0 results"
                      : `${(page - 1) * perPage + 1}–${Math.min(page * perPage, totalDocs)} of ${totalDocs}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(perPage)}
                      onValueChange={(v) => {
                        if (!v) return;
                        updateParams({ limit: v, page: null });
                      }}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 / page</SelectItem>
                        <SelectItem value="20">20 / page</SelectItem>
                        <SelectItem value="50">50 / page</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!listQuery.data.hasPrevPage}
                      onClick={() => goToPage(page - 1)}
                    >
                      <ChevronLeft />
                      Prev
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {listQuery.data.page} of {listQuery.data.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!listQuery.data.hasNextPage}
                      onClick={() => goToPage(page + 1)}
                    >
                      Next
                      <ChevronRight />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={bulkConfirm}
        onOpenChange={setBulkConfirm}
        title={`Delete ${selected.size > 1 ? `${selected.size} records` : "this record"}?`}
        description={`This permanently removes the selected ${label.toLowerCase()}. This action cannot be undone.`}
        confirmLabel={deleteMany.isPending ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        destructive
        loading={deleteMany.isPending}
        onConfirm={() => deleteMany.mutate()}
      />
    </div>
  );
}
