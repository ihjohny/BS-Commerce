import React from 'react'
import type { DocumentViewServerProps } from 'payload'
import { Gutter } from '@payloadcms/ui'
import { OrderDetailClient } from './OrderDetailClient'

/**
 * Server Component: OrderDetailView
 * Entry point for Payload CMS collection views.edit.root.
 * Overrides the entire document edit view to remove redundant default Payload tabs (Edit, API).
 * Receives DocumentViewServerProps, loads deep relations (items, customer, store, history),
 * and renders the production-grade Order Management UI.
 */
export default async function OrderDetailView(props: DocumentViewServerProps) {
  const { doc, params, payload: directPayload, initPageResult } = props || {}
  const payload = directPayload || initPageResult?.req?.payload

  // Extract order ID
  const segments = (params as Record<string, any>)?.segments
  const orderId =
    doc?.id ||
    (Array.isArray(segments) ? segments[segments.length - 1] : (params as Record<string, any>)?.id)

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
    <Gutter>
      {/* Clean top spacing below Payload Document tabs without duplicate divider */}
      <div
        style={{
          marginTop: '1.25rem',
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
