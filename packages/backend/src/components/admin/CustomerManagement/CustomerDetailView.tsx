import React from 'react'
import type { DocumentViewServerProps } from 'payload'
import { Gutter } from '@payloadcms/ui'
import { CustomerDetailClient } from './CustomerDetailClient'
import NativeCustomerEditView from './NativeCustomerEditView'

/**
 * Server Component: CustomerDetailView
 * Entry point for Payload CMS `users` collection views.edit.default and views.edit.edit.
 * - When clicking [Create New] (/create) or visiting raw edit (/edit): Renders Payload's native customer form ("old view").
 * - When clicking a customer in the list (/admin/collections/users/:id): Renders the rich Customer Details view.
 */
export default async function CustomerDetailView(props: DocumentViewServerProps) {
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

  // If creating new user or editing raw fields, safely render Payload's native edit form
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

    return <NativeCustomerEditView {...(clientProps as any)} />
  }

  // Otherwise, extract customer user ID for rich Customer Details view
  const segmentId =
    lastSegment === 'details' || lastSegment === 'edit'
      ? segments[segments.length - 2]
      : lastSegment
  const customerId = doc?.id || (params as Record<string, any>)?.id || segmentId

  let fullCustomer: any = doc
  let orders: any[] = []

  if (payload && customerId) {
    try {
      // 1. Fetch user doc with populated addresses/relations if not already complete
      if (!fullCustomer || !fullCustomer.email) {
        fullCustomer = await payload.findByID({
          collection: 'users',
          id: String(customerId),
          depth: 2,
          overrideAccess: true,
        })
      }

      // 2. Fetch orders placed by this customer (by customer user ID, email, or phone)
      const orConditions: any[] = [{ customer: { equals: String(customerId) } }]

      if (fullCustomer?.email) {
        orConditions.push({ guestEmail: { equals: fullCustomer.email } })
        orConditions.push({ 'buyerSnapshot.email': { equals: fullCustomer.email } })
      }
      if (fullCustomer?.phone) {
        orConditions.push({ guestPhone: { equals: fullCustomer.phone } })
        orConditions.push({ 'buyerSnapshot.phone': { equals: fullCustomer.phone } })
      }

      const ordersResult = await payload.find({
        collection: 'orders',
        where: {
          or: orConditions,
        },
        sort: '-createdAt',
        limit: 100,
        depth: 1,
        overrideAccess: true,
      })

      orders = ordersResult.docs || []
    } catch (err) {
      console.error('[CustomerDetailView] Error loading customer relations:', err)
    }
  }

  if (!fullCustomer) {
    return (
      <Gutter>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--bs-error, #dc2626)' }}>
          Customer account could not be loaded. Please return to the customer list.
        </div>
      </Gutter>
    )
  }

  // 3. Compute Customer Metrics
  const totalOrders = orders.length
  let totalSpent = 0
  let completedOrdersCount = 0
  let firstOrderDate: string | null = null
  let lastOrderDate: string | null = null
  let currency = 'BDT'

  if (orders.length > 0) {
    lastOrderDate = orders[0]?.placedAt || orders[0]?.createdAt || null
    firstOrderDate = orders[orders.length - 1]?.placedAt || orders[orders.length - 1]?.createdAt || null

    for (const order of orders) {
      if (order.currency) currency = order.currency
      const orderTotal = Number(order.grandTotal || 0)
      totalSpent += orderTotal

      if (['delivered', 'completed', 'shipped'].includes(order.status)) {
        completedOrdersCount++
      }
    }
  }

  const averageOrderValue = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0

  const metrics = {
    totalOrders,
    totalSpent,
    averageOrderValue,
    firstOrderDate,
    lastOrderDate,
    completedOrdersCount,
  }

  // Shape customer data
  const customerData = {
    id: String(fullCustomer.id),
    username: fullCustomer.username || null,
    email: fullCustomer.email || null,
    phone: fullCustomer.phone || null,
    firstName: fullCustomer.firstName || null,
    lastName: fullCustomer.lastName || null,
    displayName: fullCustomer.displayName || null,
    role: fullCustomer.role || 'customer',
    status: fullCustomer.status || 'active',
    emailVerified: fullCustomer.emailVerified ?? false,
    phoneVerified: fullCustomer.phoneVerified ?? false,
    locale: fullCustomer.locale || 'en',
    createdAt: fullCustomer.createdAt || null,
    updatedAt: fullCustomer.updatedAt || null,
    addresses: Array.isArray(fullCustomer.addresses) ? fullCustomer.addresses : null,
  }

  // Shape orders data
  const ordersData = orders.map((o: any) => ({
    id: String(o.id),
    orderNumber: o.orderNumber || String(o.id),
    placedAt: o.placedAt || null,
    createdAt: o.createdAt || null,
    status: o.status || 'pending',
    paymentStatus: o.paymentStatus || 'unpaid',
    grandTotal: Number(o.grandTotal || 0),
    currency: o.currency || currency,
    itemsCount: Array.isArray(o.items) ? o.items.length : 0,
    shippingAddress: o.shippingAddress || null,
    deviceTracking: o.deviceTracking || null,
  }))

  return (
    <Gutter className="customer-detail-view-container">
      <div style={{ marginTop: '0.75rem' }}>
        <CustomerDetailClient
          customer={customerData}
          orders={ordersData}
          metrics={metrics}
          currency={currency}
        />
      </div>
    </Gutter>
  )
}
