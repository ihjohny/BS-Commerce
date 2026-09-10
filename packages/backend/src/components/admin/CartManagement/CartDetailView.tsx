import React from 'react'
import type { DocumentViewServerProps } from 'payload'
import { Gutter } from '@payloadcms/ui'
import { CartDetailClient } from './CartDetailClient'
import NativeCartEditView from './NativeCartEditView'

/**
 * Server Component: CartDetailView
 * Entry point for Payload CMS `carts` collection views.edit.default and views.edit.edit.
 * - When clicking [Create New] (/create) or visiting raw edit (/edit): Renders Payload's native cart form ("old view").
 * - When clicking a cart in the list (/admin/collections/carts/:id): Renders the rich, production-ready Cart Details view.
 */
export default async function CartDetailView(props: DocumentViewServerProps) {
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

  // If creating new cart or editing raw fields, safely render Payload's native edit form
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

    return <NativeCartEditView {...(clientProps as any)} />
  }

  // Otherwise, extract cart ID for rich Cart Details view
  const segmentId =
    lastSegment === 'details' || lastSegment === 'edit'
      ? segments[segments.length - 2]
      : lastSegment
  const cartId = doc?.id || (params as Record<string, any>)?.id || segmentId

  let fullCart: any = doc
  let customerOrders: any[] = []
  let customerMetrics: {
    totalOrders: number
    totalSpent: number
    currency: string
    lastOrderDate: string | null
  } = {
    totalOrders: 0,
    totalSpent: 0,
    currency: 'BDT',
    lastOrderDate: null,
  }

  if (payload && cartId) {
    try {
      fullCart = await payload.findByID({
        collection: 'carts',
        id: String(cartId),
        depth: 2,
        overrideAccess: true,
      })

      // Fetch customer previous orders if this cart has an associated registered user or guestId
      const userObj = fullCart?.user
      const customerUserId = userObj?.id || (typeof userObj === 'string' ? userObj : null)
      const guestId = fullCart?.guestId

      const orConditions: any[] = []
      if (customerUserId) {
        orConditions.push({ customer: { equals: String(customerUserId) } })
        if (userObj?.email) {
          orConditions.push({ guestEmail: { equals: userObj.email } })
          orConditions.push({ 'buyerSnapshot.email': { equals: userObj.email } })
        }
        if (userObj?.phone) {
          orConditions.push({ guestPhone: { equals: userObj.phone } })
          orConditions.push({ 'buyerSnapshot.phone': { equals: userObj.phone } })
        }
      }

      if (orConditions.length > 0) {
        const ordersRes = await payload.find({
          collection: 'orders',
          where: {
            or: orConditions,
          },
          sort: '-createdAt',
          limit: 10,
          depth: 1,
          overrideAccess: true,
        })

        customerOrders = ordersRes.docs || []

        let spent = 0
        let orderCurrency = 'BDT'
        for (const ord of customerOrders) {
          spent += Number(ord.grandTotal || 0)
          if (ord.currency) orderCurrency = ord.currency
        }

        customerMetrics = {
          totalOrders: ordersRes.totalDocs || customerOrders.length,
          totalSpent: spent,
          currency: orderCurrency,
          lastOrderDate: customerOrders[0]?.placedAt || customerOrders[0]?.createdAt || null,
        }
      }
    } catch (err) {
      console.error('[CartDetailView] Error loading cart relations and customer history:', err)
    }
  }

  return (
    <Gutter className="cart-detail-view-container">
      <div style={{ paddingTop: '1.25rem', paddingBottom: '2.5rem' }}>
        <CartDetailClient
          cart={fullCart || doc}
          customerOrders={customerOrders}
          customerMetrics={customerMetrics}
        />
      </div>
    </Gutter>
  )
}
