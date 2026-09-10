'use client'

import React, { useState } from 'react'
import { OrderHeader } from './components/OrderHeader'
import { OrderItemsTable } from './components/OrderItemsTable'
import { OrderFinancials } from './components/OrderFinancials'
import { CustomerCard } from './components/CustomerCard'
import { FulfillmentCard } from './components/FulfillmentCard'
import { OrderTimeline, type StatusHistoryItem } from './components/OrderTimeline'
import { OrderNotesCard } from './components/OrderNotesCard'
import { DeviceAuditCard } from './components/DeviceAuditCard'
import { printOrderInvoice } from './components/OrderInvoicePrint'
import { EditItemsModal, type EditableItem } from './components/modals/EditItemsModal'
import { EditAddressModal } from './components/modals/EditAddressModal'
import { EditNotesModal } from './components/modals/EditNotesModal'
import { EditFinancialsModal } from './components/modals/EditFinancialsModal'
import { EditPaymentStatusModal } from './components/modals/EditPaymentStatusModal'
import { EditOrderStatusModal } from './components/modals/EditOrderStatusModal'
import type { AddressData } from './components/FulfillmentCard'
import { SetStepNav } from '@payloadcms/ui'

export type OrderDetailClientProps = {
  initialOrder: any
  initialHistory: StatusHistoryItem[]
  stores?: any[]
}

type ActiveModalType = 'items' | 'address' | 'notes' | 'financials' | 'paymentStatus' | 'orderStatus' | null

export function OrderDetailClient({
  initialOrder,
  initialHistory,
}: OrderDetailClientProps) {
  const [order, setOrder] = useState(initialOrder)
  const [history, setHistory] = useState<StatusHistoryItem[]>(initialHistory)
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Re-fetch latest order data and history
  const refreshOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${order.id}?depth=2`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        // Also fetch items explicitly to ensure snapshots & image details are fresh
        const itemsRes = await fetch(
          `/api/order-items?where[order][equals]=${order.id}&depth=2&limit=1000`,
          { credentials: 'include' }
        )
        if (itemsRes.ok) {
          const itemsData = await itemsRes.json()
          if (itemsData.docs && itemsData.docs.length > 0) {
            data.items = itemsData.docs
          }
        }
        setOrder(data)
      }

      const histRes = await fetch(
        `/api/order-status-history?where[order][equals]=${order.id}&sort=-timestamp&depth=1`,
        { credentials: 'include' }
      )
      if (histRes.ok) {
        const histData = await histRes.json()
        setHistory(histData.docs || [])
      }
    } catch {
      // Background refresh failure is non-fatal
    }
  }

  // Handle one-click quick status change or modal status change
  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg = data.errors?.[0]?.message || 'Failed to update order status'
        setError(msg)
        return
      }

      setSuccess(`Order status successfully transitioned to "${newStatus.replace(/-/g, ' ')}"`)
      setActiveModal(null)
      await refreshOrder()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error while updating order status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Handle Section 1: Save Items (Available at all stages)
  const handleSaveItems = async ({
    items,
    deletedItemIds,
    subtotal,
  }: {
    items: EditableItem[]
    deletedItemIds: string[]
    subtotal: number
  }) => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // 1. Delete removed items
      if (deletedItemIds && deletedItemIds.length > 0) {
        for (const delId of deletedItemIds) {
          await fetch(`/api/order-items/${delId}`, {
            method: 'DELETE',
            credentials: 'include',
          })
        }
      }

      // 2. Track all current item IDs to link to parent order
      const finalItemIds: string[] = []

      // 3. Process new and existing items
      for (const item of items) {
        if (item.isNew) {
          const createRes = await fetch('/api/order-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              order: order.id,
              product: item.productId,
              variant: item.variantId || undefined,
              productName: item.productName,
              variantName: item.variantName || undefined,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              productImage: item.productImage || undefined,
              productSlug: item.productSlug || undefined,
            }),
          })
          if (!createRes.ok) {
            const errData = await createRes.json().catch(() => ({}))
            const msg = errData.errors?.[0]?.message || `Failed to create item ${item.productName}`
            setError(msg)
            setSaving(false)
            return
          }
          const createdDoc = await createRes.json()
          if (createdDoc.doc?.id) {
            finalItemIds.push(createdDoc.doc.id)
          }
        } else {
          finalItemIds.push(item.id)
          const itemRes = await fetch(`/api/order-items/${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            }),
          })
          if (!itemRes.ok) {
            const errData = await itemRes.json().catch(() => ({}))
            const msg = errData.errors?.[0]?.message || `Failed to update item ${item.productName}`
            setError(msg)
            setSaving(false)
            return
          }
        }
      }

      // 4. Recalculate grandTotal based on new subtotal
      const shipping = Number(order.shippingTotal || 0)
      const tax = Number(order.taxTotal || 0)
      const discount = Number(order.discountTotal || 0)
      const grandTotal = Math.max(0, subtotal + shipping + tax - discount)

      // 5. Update order document
      const orderRes = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: finalItemIds,
          subtotal,
          grandTotal,
        }),
      })

      if (!orderRes.ok) {
        const data = await orderRes.json().catch(() => ({}))
        const msg = data.errors?.[0]?.message || 'Failed to update order items'
        setError(msg)
        return
      }

      setSuccess('Order items updated successfully.')
      setActiveModal(null)
      await refreshOrder()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error while updating items')
    } finally {
      setSaving(false)
    }
  }

  // Handle Section 2: Save Addresses
  const handleSaveAddress = async (addresses: {
    shippingAddress: AddressData
    billingAddress: AddressData
  }) => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shippingAddress: addresses.shippingAddress,
          billingAddress: addresses.billingAddress,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.errors?.[0]?.message || 'Failed to update addresses'
        setError(msg)
        return
      }

      setSuccess('Shipping and billing addresses updated successfully.')
      setActiveModal(null)
      await refreshOrder()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error while updating address')
    } finally {
      setSaving(false)
    }
  }

  // Handle Section 3: Save Notes
  const handleSaveNotes = async (notes: string) => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.errors?.[0]?.message || 'Failed to update notes'
        setError(msg)
        return
      }

      setSuccess('Order notes updated successfully.')
      setActiveModal(null)
      await refreshOrder()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error while updating notes')
    } finally {
      setSaving(false)
    }
  }

  // Handle Section 4: Save Financials & Discount Coupon
  const handleSaveFinancials = async (data: {
    shippingTotal: number
    taxTotal: number
    discountTotal: number
    appliedCoupon?: string | null
    couponCodeSnapshot?: string | null
    grandTotal: number
  }) => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const payloadBody: Record<string, any> = {
        shippingTotal: data.shippingTotal,
        taxTotal: data.taxTotal,
        discountTotal: data.discountTotal,
        grandTotal: data.grandTotal,
      }

      // Update coupon relations/snapshots
      if (data.appliedCoupon !== undefined) {
        payloadBody.appliedCoupon = data.appliedCoupon
      }
      if (data.couponCodeSnapshot !== undefined) {
        payloadBody.couponCodeSnapshot = data.couponCodeSnapshot
      }

      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payloadBody),
      })

      const resData = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = resData.errors?.[0]?.message || 'Failed to update financial adjustments'
        setError(msg)
        return
      }

      setSuccess('Financial adjustments and discount coupon updated successfully.')
      setActiveModal(null)
      await refreshOrder()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error while updating financials')
    } finally {
      setSaving(false)
    }
  }

  // Handle Section 5: Save Payment Status
  const handleSavePaymentStatus = async (newPaymentStatus: string) => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paymentStatus: newPaymentStatus }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.errors?.[0]?.message || 'Failed to update payment status'
        setError(msg)
        return
      }

      setSuccess(`Payment status successfully set to "${newPaymentStatus.replace(/-/g, ' ')}"`)
      setActiveModal(null)
      await refreshOrder()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error while updating payment status')
    } finally {
      setSaving(false)
    }
  }

  // Handle print invoice
  const handlePrint = () => {
    printOrderInvoice(order)
  }

  // Line items can be edited at any stage per user specification
  const canEditItems = true

  const appliedCouponId =
    typeof order.appliedCoupon === 'object' && order.appliedCoupon !== null
      ? order.appliedCoupon.id
      : typeof order.appliedCoupon === 'string'
      ? order.appliedCoupon
      : null

  const customerId =
    typeof order.customer === 'object' && order.customer !== null
      ? order.customer.id
      : typeof order.customer === 'string'
      ? order.customer
      : undefined

  return (
    <div
      style={{
        maxWidth: 1300,
        margin: '0 auto',
        padding: '0 0.5rem 2rem 0.5rem',
        color: 'var(--theme-text, #0f172a)',
        fontFamily: 'var(--font-body, system-ui, -apple-system, sans-serif)',
      }}
    >
      {/* Top bar StepNav: Home icon / Orders / Order ID */}
      <SetStepNav
        nav={[
          {
            label: 'Orders',
            url: '/admin/collections/orders',
          },
          {
            label: order.orderNumber || order.id,
          },
        ]}
      />

      {/* Main Order Header */}
      <OrderHeader
        order={order}
        onStatusChange={handleStatusChange}
        onEditOrderStatus={() => setActiveModal('orderStatus')}
        onEditPaymentStatus={() => setActiveModal('paymentStatus')}
        onPrint={handlePrint}
        updatingStatus={updatingStatus}
      />

      {/* Flash Success Notification */}
      {success && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            background: 'var(--bs-success-subtle, rgba(22, 163, 74, 0.12))',
            border: '1px solid var(--bs-success, #16a34a)',
            color: 'var(--bs-success, #16a34a)',
            fontSize: 13,
            fontWeight: 500,
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span>{success}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Flash Error Notification */}
      {error && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            background: 'var(--bs-error-subtle, rgba(220, 38, 38, 0.12))',
            border: '1px solid var(--bs-error, #dc2626)',
            color: 'var(--bs-error, #dc2626)',
            fontSize: 13,
            fontWeight: 500,
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Responsive Card Grid Layout */}
      <div className="order-details-responsive-grid">
        {/* Main Column Group */}
        <div className="order-layout-main">
          <div className="order-grid-card order-grid-items">
            <OrderItemsTable
              items={order.items || []}
              currency={order.currency}
              canEdit={canEditItems}
              onEditItems={() => setActiveModal('items')}
            />
          </div>

          <div className="order-grid-card order-grid-financials">
            <OrderFinancials
              order={order}
              onEditFinancials={() => setActiveModal('financials')}
            />
          </div>

          <div className="order-grid-card order-grid-timeline">
            <OrderTimeline
              history={history}
              currentStatus={order.status}
              placedAt={order.placedAt}
              createdAt={order.createdAt}
            />
          </div>
        </div>

        {/* Side Column Group */}
        <div className="order-layout-side">
          <div className="order-grid-card order-grid-customer">
            <CustomerCard
              customer={order.customer}
              guestEmail={order.guestEmail}
              guestPhone={order.guestPhone}
              buyerSnapshot={order.buyerSnapshot}
            />
          </div>

          <div className="order-grid-card order-grid-fulfillment">
            <FulfillmentCard
              shippingAddress={order.shippingAddress}
              billingAddress={order.billingAddress}
              store={order.store}
              onEditAddress={() => setActiveModal('address')}
            />
          </div>

          <div className="order-grid-card order-grid-notes">
            <OrderNotesCard
              notes={order.notes}
              onEditNotes={() => setActiveModal('notes')}
            />
          </div>

          <div className="order-grid-card order-grid-audit">
            <DeviceAuditCard
              deviceTracking={order.deviceTracking}
              preferredLanguage={order.buyerSnapshot?.locale}
            />
          </div>
        </div>
      </div>

      {/* Section Dialog Modals */}
      {activeModal === 'items' && (
        <EditItemsModal
          isOpen={true}
          initialItems={order.items || []}
          currency={order.currency}
          onClose={() => setActiveModal(null)}
          onSave={handleSaveItems}
          saving={saving}
        />
      )}

      {activeModal === 'address' && (
        <EditAddressModal
          isOpen={true}
          initialShippingAddress={order.shippingAddress}
          initialBillingAddress={order.billingAddress}
          onClose={() => setActiveModal(null)}
          onSave={handleSaveAddress}
          saving={saving}
        />
      )}

      {activeModal === 'notes' && (
        <EditNotesModal
          isOpen={true}
          initialNotes={order.notes}
          onClose={() => setActiveModal(null)}
          onSave={handleSaveNotes}
          saving={saving}
        />
      )}

      {activeModal === 'financials' && (
        <EditFinancialsModal
          isOpen={true}
          currency={order.currency}
          subtotal={order.subtotal}
          initialDiscountTotal={order.discountTotal || 0}
          initialCouponCode={order.couponCodeSnapshot}
          initialAppliedCouponId={appliedCouponId}
          initialShippingTotal={order.shippingTotal}
          initialTaxTotal={order.taxTotal}
          customerId={customerId}
          onClose={() => setActiveModal(null)}
          onSave={handleSaveFinancials}
          saving={saving}
        />
      )}

      {activeModal === 'paymentStatus' && (
        <EditPaymentStatusModal
          isOpen={true}
          currentStatus={order.paymentStatus}
          onClose={() => setActiveModal(null)}
          onSave={handleSavePaymentStatus}
          saving={saving}
        />
      )}

      {activeModal === 'orderStatus' && (
        <EditOrderStatusModal
          isOpen={true}
          currentStatus={order.status}
          onClose={() => setActiveModal(null)}
          onSave={handleStatusChange}
          saving={updatingStatus}
        />
      )}
    </div>
  )
}
