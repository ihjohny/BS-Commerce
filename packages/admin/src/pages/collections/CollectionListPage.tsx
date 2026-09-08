import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { api } from "@/lib/api";
import type { Paginated } from "@/lib/api";
import { getCollectionSchema } from "@/lib/schema";
import { useAccess } from "@/contexts/AccessContext";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
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

function CellValue({ value, col }: { value: unknown; col: string }) {
  if (value === null || value === undefined || value === "")
    return <span className="text-muted-foreground">—</span>;

  if (col === "_status") {
    const s = String(value);
    return (
      <Badge variant={s === "published" ? "secondary" : "outline"}>{s}</Badge>
    );
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (value.length === 0)
      return <span className="text-muted-foreground">—</span>;
    return (
      <span>
        {value.length === 1 ? cellText(value[0]) : `${value.length} items`}
      </span>
    );
  }
  if (typeof value === "object") {
    // Populated relationship (depth=1) → render its title.
    return <span className="truncate">{cellText(value)}</span>;
  }
  const s = String(value);
  if (isIsoDate(s)) {
    return (
      <span>
        {new Intl.DateTimeFormat("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(s))}
      </span>
    );
  }
  return <span className="truncate">{s}</span>;
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

export function CollectionListPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const schema = getCollectionSchema(slug);
  const { locale, can } = useAccess();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<string>("-createdAt");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const isDrafts = Boolean(schema?.versions?.drafts);
  const columns = useMemo(() => {
    if (!schema) return [];
    const cols = schema.defaultColumns?.length
      ? schema.defaultColumns
      : [schema.useAsTitle, ...(schema.timestamps ? ["createdAt"] : [])];
    const out = cols.filter((c) => c !== "id");
    if (isDrafts && !out.includes("_status")) out.push("_status");
    return out;
  }, [schema, isDrafts]);

  const canCreate = can("collections", slug, "create");
  const canDelete = can("collections", slug, "delete");

  const listQuery = useQuery({
    queryKey: ["collection", slug, page, search, sort, statusFilter, locale],
    enabled: Boolean(schema),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("limit", "10");
      params.set("page", String(page));
      params.set("depth", "1");
      params.set("sort", sort);
      params.set("locale", locale);
      if (schema?.hasLocalized) params.set("fallback-locale", "null");
      if (isDrafts && statusFilter === "all") params.set("draft", "true");
      if (statusFilter !== "all")
        params.set(`where[_status][equals]`, statusFilter);
      if (search) {
        const tf = schema!.useAsTitle;
        if (tf !== "id") params.set(`where[or][0][${tf}][like]`, search);
        params.set(`where[or][1][id][like]`, search);
      }
      return api.get<Paginated<Record<string, unknown>>>(
        `/api/${slug}?${params.toString()}`,
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
  const allOnPageSelected =
    docs.length > 0 && docs.every((d) => selected.has(String(d.id)));

  const toggleAll = () => {
    if (allOnPageSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(docs.map((d) => String(d.id))));
    }
  };

  const toggleSort = (col: string) => {
    if (col === "_status" || col === "id") return;
    setSort((prev) => (prev === col ? `-${col}` : col));
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const label = schema.label;

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
            {isDrafts && (
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v ?? "all");
                  setPage(1);
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
              {search
                ? "No results for this search."
                : `No ${label.toLowerCase()} yet.`}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {canDelete && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allOnPageSelected}
                          onCheckedChange={toggleAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                    )}
                    {columns.map((col) => (
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
                        {columns.map((col) => (
                          <TableCell key={col} className="max-w-56 truncate">
                            <CellValue value={doc[col]} col={col} />
                          </TableCell>
                        ))}
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
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
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {listQuery.data && listQuery.data.totalPages > 1 && (
                <div className="flex items-center justify-between pb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!listQuery.data.hasPrevPage}
                    onClick={() => setPage(page - 1)}
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
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                    <ChevronRight />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={bulkConfirm} onOpenChange={setBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete{" "}
              {selected.size > 1 ? `${selected.size} records` : "this record"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected {label.toLowerCase()}. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMany.mutate()}
              className="text-destructive"
            >
              {deleteMany.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
