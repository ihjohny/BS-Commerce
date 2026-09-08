import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { api } from "@/lib/api";
import type { Paginated } from "@/lib/api";
import { getCollectionSchema } from "@/lib/schema";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  const s = String(value);
  // ISO dates → readable
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
      new Date(s),
    );
  }
  return s;
}

export function CollectionListPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const schema = getCollectionSchema(slug);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["collection", slug, page, search],
    enabled: Boolean(schema),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("limit", "10");
      params.set("page", String(page));
      params.set("depth", "0");
      params.set("sort", "-createdAt");
      if (search) {
        params.set(`where[or][0][${schema!.titleField}][like]`, search);
        params.set(`where[or][1][id][like]`, search);
      }
      return api.get<Paginated<Record<string, unknown>>>(
        `/api/${slug}?${params.toString()}`,
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/${slug}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection", slug] });
      setDeleteId(null);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {schema.title}
          </h1>
          {listQuery.data && (
            <p className="text-sm text-muted-foreground">
              {listQuery.data.totalDocs} total
            </p>
          )}
        </div>
        <Button
          asChild={false}
          onClick={() => navigate(`/collections/${slug}/new`)}
          size="sm"
        >
          <Plus />
          New {schema.title.replace(/s$/, "")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearch} className="w-full max-w-sm">
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                placeholder={`Search by ${schema.titleField}…`}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label={`Search ${schema.title}`}
              />
            </InputGroup>
          </form>
        </CardHeader>
        <CardContent>
          {listQuery.isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : listQuery.error ? (
            <Alert variant="destructive">
              <AlertTitle>Failed to load {schema.title}</AlertTitle>
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
                : `No ${schema.title.toLowerCase()} yet.`}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {schema.columns.map((col) => (
                      <TableHead key={col}>{col}</TableHead>
                    ))}
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((doc) => {
                    const id = String(doc.id);
                    return (
                      <TableRow key={id}>
                        {schema.columns.map((col) => (
                          <TableCell key={col} className="max-w-48 truncate">
                            {formatCell(doc[col])}
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() =>
                                navigate(`/collections/${slug}/${id}/edit`)
                              }
                              aria-label="Edit"
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleteId(id)}
                              aria-label="Delete"
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {listQuery.data && listQuery.data.totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (listQuery.data?.hasPrevPage) setPage(page - 1);
                        }}
                        aria-disabled={!listQuery.data?.hasPrevPage}
                        className={
                          listQuery.data?.hasPrevPage
                            ? ""
                            : "pointer-events-none opacity-50"
                        }
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="px-3 text-sm text-muted-foreground">
                        Page {listQuery.data.page} of{" "}
                        {listQuery.data.totalPages}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (listQuery.data?.hasNextPage) setPage(page + 1);
                        }}
                        aria-disabled={!listQuery.data?.hasNextPage}
                        className={
                          listQuery.data?.hasNextPage
                            ? ""
                            : "pointer-events-none opacity-50"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete this {schema.title.replace(/s$/, "").toLowerCase()}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="text-destructive"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
