import React from 'react'
import type { DocumentViewServerProps } from 'payload'
import { Gutter } from '@payloadcms/ui'
import { OrderDetailClient } from './OrderDetailClient'
import NativeEditView from './NativeEditView'

/**
 * Server Component: OrderDetailView
 * Entry point for Payload CMS collection views.edit.default and views.edit.edit.
 * - When clicking [Create New] (/create) or visiting raw edit (/edit): Renders Payload's native form ("old view").
 * - When clicking an order in the list (/admin/collections/orders/:id): Renders the custom Order Details view.
 */
export default async function OrderDetailView(props: DocumentViewServerProps) {
  const { doc, params, payload: directPayload, initPageResult, searchParams } = props || {}
  const payload = directPayload || initPageResult?.req?.payload

  // Extract route segments to detect /create or /edit
  const rawSegments = (params as Record<string, any>)?.segments
  const segments = Array.isArray(rawSegments) ? rawSegments : []
  const lastSegment = segments[segments.length - 1]

  const isCreate =
    !doc?.id &&
    (lastSegment === 'create' ||
      segments.includes('create') ||
      (params as Record<string, any>)?.id === 'create')

  const isEditMode =
    lastSegment === 'edit' ||
    segments.includes('edit') ||
    (searchParams as Record<string, any>)?.view === 'edit'

  // If creating new order or editing raw fields, safely render Payload's native form
  if (isCreate || isEditMode) {
    const clientProps = {
      BeforeDocumentControls: (props as any).BeforeDocumentControls,
      Description: (props as any).Description,
      EditMenuItems: (props as any).EditMenuItems,
      LivePreview: (props as any).LivePreview,
      PreviewButton: (props as any).PreviewButton,
      PublishButton: (props as any).PublishButton,
      SaveButton: (props as any).SaveButton,
      SaveDraftButton: (props as any).SaveDraftButton,
      Status: (props as any).Status,
      UnpublishButton: (props as any).UnpublishButton,
      Upload: (props as any).Upload,
      UploadControls: (props as any).UploadControls,
    }

    return <NativeEditView {...(clientProps as any)} />
  }

  // Otherwise, extract order ID for custom Order Details view
  const segmentId =
    lastSegment === 'details' || lastSegment === 'edit'
      ? segments[segments.length - 2]
      : lastSegment
  const orderId = doc?.id || (params as Record<string, any>)?.id || segmentId

  let fullOrder = doc
  let historyDocs: any[] = []
  let storeDocs: any[] = []

  if (payload && orderId) {
    try {
      // 1. Fetch full order with populated relations
      fullOrder = await payload.findByID({
        collection: 'orders',
        id: String(orderId),
        depth: 2,
        overrideAccess: true,
      })

      // 2. Fetch order items explicitly by order ID to ensure snapshots & image details are 100% loaded
      const itemResult = await payload.find({
        collection: 'order-items',
        where: { order: { equals: String(orderId) } },
        depth: 2,
        limit: 1000,
        overrideAccess: true,
      })
      if (itemResult.docs && itemResult.docs.length > 0) {
        fullOrder.items = itemResult.docs
      }

      // 3. Fetch order status history timeline
      const histResult = await payload.find({
        collection: 'order-status-history',
        where: { order: { equals: String(orderId) } },
        sort: '-timestamp',
        depth: 1,
        limit: 100,
        overrideAccess: true,
      })
      historyDocs = histResult.docs || []

      // 4. Fetch active stores/warehouses for assignment
      const storeResult = await payload.find({
        collection: 'stock-locations',
        where: { active: { equals: true } },
        depth: 0,
        limit: 100,
        overrideAccess: true,
      })
      storeDocs = storeResult.docs || []
    } catch (err) {
      console.error('[OrderDetailView] Error loading order relations:', err)
    }
  }

  if (!fullOrder) {
    return (
      <Gutter>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--bs-error, #dc2626)' }}>
          Order could not be loaded. Please return to the order list.
        </div>
      </Gutter>
    )
  }

  const stores = storeDocs.map((s) => ({
    id: s.id,
    name: s.name,
    address: s.address,
  }))

  return (
    <Gutter className="order-detail-view-container">
      {/* Clean top spacing below Payload Document tabs without duplicate divider */}
      <div
        style={{
          marginTop: '0.75rem',
        }}
      >
        <OrderDetailClient
          initialOrder={fullOrder}
          initialHistory={historyDocs}
          stores={stores}
        />
      </div>
    </Gutter>
  )
}
