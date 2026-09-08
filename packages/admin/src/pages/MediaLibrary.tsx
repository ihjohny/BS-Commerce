import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, Upload } from 'lucide-react'

import { api, assetUrl } from '@/lib/api'
import type { MediaDoc, Paginated } from '@/lib/api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'

function MediaCard({ doc, onDelete }: { doc: MediaDoc; onDelete: (id: string) => void }) {
  const src = assetUrl(doc.sizes?.thumbnail?.url ?? doc.url)
  return (
    <Card className="overflow-hidden pt-0">
      <div className="flex aspect-4/3 items-center justify-center overflow-hidden bg-muted">
        {src && doc.mimeType?.startsWith('image/') ? (
          <img src={src} alt={doc.alt || doc.filename || ''} className="size-full object-cover" />
        ) : (
          <span className="text-xs text-muted-foreground">{doc.mimeType ?? 'file'}</span>
        )}
      </div>
      <CardHeader className="py-2">
        <CardTitle className="truncate text-sm">{doc.alt || doc.filename}</CardTitle>
        <CardDescription className="truncate text-xs">{doc.filename}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(doc.id)}>
          <Trash2 />
          Delete
        </Button>
      </CardFooter>
    </Card>
  )
}

export function MediaLibrary() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [page, setPage] = useState(1)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [alt, setAlt] = useState('')
  const [caption, setCaption] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ['media', page],
    queryFn: () => api.get<Paginated<MediaDoc>>(`/api/media?limit=12&page=${page}&depth=0&sort=-createdAt`),
  })

  const uploadMutation = useMutation({
    mutationFn: () => {
      const form = new FormData()
      if (file) form.append('file', file)
      if (alt) form.append('alt', alt)
      if (caption) form.append('caption', caption)
      form.append('_payload', JSON.stringify({ alt: alt || undefined, caption: caption || undefined }))
      return api.postForm<MediaDoc>('/api/media', form)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
      closeUpload()
    },
    onError: (err) => setUploadError(err instanceof Error ? err.message : 'Upload failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/media/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
      setDeleteId(null)
    },
  })

  function closeUpload() {
    setUploadOpen(false)
    setFile(null)
    setAlt('')
    setCaption('')
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const docs = listQuery.data?.docs ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Media</h1>
          {listQuery.data && (
            <p className="text-sm text-muted-foreground">{listQuery.data.totalDocs} files</p>
          )}
        </div>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload />
          Upload
        </Button>
      </div>

      {listQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-4/3 w-full" />
          ))}
        </div>
      ) : listQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to load media</AlertTitle>
          <AlertDescription>
            {listQuery.error instanceof Error ? listQuery.error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No media uploaded yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {docs.map((doc) => (
            <MediaCard key={doc.id} doc={doc} onDelete={setDeleteId} />
          ))}
        </div>
      )}

      {listQuery.data && listQuery.data.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (listQuery.data?.hasPrevPage) setPage(page - 1)
                }}
                className={listQuery.data?.hasPrevPage ? '' : 'pointer-events-none opacity-50'}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-3 text-sm text-muted-foreground">
                Page {listQuery.data.page} of {listQuery.data.totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (listQuery.data?.hasNextPage) setPage(page + 1)
                }}
                className={listQuery.data?.hasNextPage ? '' : 'pointer-events-none opacity-50'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <Dialog open={uploadOpen} onOpenChange={(open) => !open && closeUpload()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload media</DialogTitle>
            <DialogDescription>Images (JPG/PNG/WebP) or PDF, up to 10 MB.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="media-file">File</FieldLabel>
              <Input
                id="media-file"
                type="file"
                ref={fileInputRef}
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="media-alt">Alt text</FieldLabel>
              <Input id="media-alt" value={alt} onChange={(e) => setAlt(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="media-caption">Caption</FieldLabel>
              <Input id="media-caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
            </Field>
            {uploadError && (
              <Alert variant="destructive">
                <AlertTitle>Upload failed</AlertTitle>
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={closeUpload}>
              Cancel
            </Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={!file || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              The file is removed from storage. Content referencing it will lose the image.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="text-destructive"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
