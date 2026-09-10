'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { SetStepNav } from '@payloadcms/ui'

export type CartItemData = {
  id?: string
  product?: {
    id?: string
    name?: any
    title?: any
    slug?: string
    images?: Array<{
      image?: {
        url?: string
        alt?: string
        sizes?: {
          thumbnail?: { url?: string }
          card?: { url?: string }
        }
      } | string
    }>
    tenant?: any
  } | string
  variant?: {
    id?: string
    title?: any
    name?: any
    sku?: any
    options?: Array<{ attribute?: string; value?: string }>
  } | string
  quantity: number
  unitPrice: number
  vendor?: any
}

export type CustomerOrderItem = {
  id: string
  orderNumber?: string | null
  createdAt?: string
  placedAt?: string
  status?: string
  paymentStatus?: string
  grandTotal?: number
  items?: any[]
  currency?: string
}

export type CustomerMetricsData = {
  totalOrders: number
  totalSpent: number
  currency: string
  lastOrderDate: string | null
}

export type CartDetailClientProps = {
  cart: {
    id: string
    user?: any
    guestId?: string | null
    items?: CartItemData[]
    subtotal?: number
    discountTotal?: number
    grandTotal?: number
    couponCode?: any
    appliedCoupon?: any
    store?: any
    customerNote?: any
    expiresAt?: string | null
    createdAt?: string
    updatedAt?: string
  }
  customerOrders?: CustomerOrderItem[]
  customerMetrics?: CustomerMetricsData
  currency?: string
}

/**
 * Safely resolves any value (string, number, boolean, or localized object { en, bn }) to a display string.
 * Prevents React 19 "throwOnInvalidObjectType" error when localized fields are rendered in JSX.
 */
function resolveString(val: any, fallback: string = ''): string {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (typeof val === 'object') {
    if (typeof val.en === 'string' && val.en) return val.en
    if (typeof val.bn === 'string' && val.bn) return val.bn
    if (typeof val.name === 'string' && val.name) return val.name
    if (typeof val.title === 'string' && val.title) return val.title
    if (typeof val.displayName === 'string' && val.displayName) return val.displayName
    for (const v of Object.values(val)) {
      if (typeof v === 'string' && v) return v
      if (typeof v === 'number') return String(v)
    }
  }
  return fallback
}

/**
 * Formats a stock-location address group object { street, city, state, postalCode, country } into a single line.
 */
function formatAddress(addr: any): string {
  if (!addr) return ''
  if (typeof addr === 'string') return addr
  if (typeof addr === 'object') {
    const parts = [
      resolveString(addr.street),
      resolveString(addr.city),
      resolveString(addr.state),
      resolveString(addr.postalCode),
      resolveString(addr.country),
    ].filter(Boolean)
    return parts.join(', ')
  }
  return ''
}

function formatMoney(amount: number, currency: string) {
  const symbol = currency === 'BDT' ? '৳' : currency === 'USD' ? '$' : `${currency} `
  const num = Number(amount || 0)
  const hasDecimals = num % 1 !== 0
  return `${symbol}${num.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return 'N/A'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return String(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(dateStr)
  }
}

function formatRelativeTime(dateStr?: string | null) {
  if (!dateStr) return 'N/A'
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diffSec < 60) return 'Just now'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
    const diffDays = Math.floor(diffSec / 86400)
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 30) return `${diffDays}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return String(dateStr)
  }
}

function formatStatusLabel(status: string): string {
  return status.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function StatusPill({ status, type = 'status' }: { status: string; type?: 'status' | 'payment' }) {
  const s = (status || '').toLowerCase()
  let color = 'var(--theme-elevation-600, #64748b)'
  let bg = 'var(--theme-elevation-150, rgba(120, 120, 120, 0.12))'

  if (s === 'pending' || s === 'unpaid') {
    color = 'var(--bs-warning, #d97706)'
    bg = 'var(--bs-warning-subtle, rgba(217, 119, 6, 0.12))'
  } else if (s === 'processing') {
    color = 'var(--bs-primary, #2563eb)'
    bg = 'var(--bs-primary-subtle, rgba(37, 99, 235, 0.12))'
  } else if (s === 'shipped' || s === 'partially-shipped') {
    color = '#6366f1'
    bg = 'rgba(99, 102, 241, 0.12)'
  } else if (s === 'delivered' || s === 'completed' || s === 'paid' || s === 'active') {
    color = 'var(--bs-success, #16a34a)'
    bg = 'var(--bs-success-subtle, rgba(22, 163, 74, 0.12))'
  } else if (s === 'refunded' || s === 'cancelled' || s === 'suspended' || s === 'banned') {
    color = 'var(--bs-error, #dc2626)'
    bg = 'var(--bs-error-subtle, rgba(220, 38, 38, 0.12))'
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 9999,
        background: bg,
        color: color,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
      {formatStatusLabel(status || 'Unknown')}
    </span>
  )
}

export function CartDetailClient({
  cart,
  customerOrders = [],
  customerMetrics,
  currency = 'BDT',
}: CartDetailClientProps) {
  const [copiedId, setCopiedId] = useState(false)
  const [copiedGuestId, setCopiedGuestId] = useState(false)

  const cartIdStr = resolveString(cart?.id, 'cart')
  const guestIdStr = resolveString(cart?.guestId)
  const items = Array.isArray(cart?.items) ? cart.items : []
  const isGuest = !cart?.user && Boolean(guestIdStr)
  const userObj = typeof cart?.user === 'object' && cart.user !== null ? cart.user : null
  const storeObj = typeof cart?.store === 'object' && cart.store !== null ? cart.store : null

  // Check expiration status
  const isExpired = cart?.expiresAt ? new Date(cart.expiresAt).getTime() < Date.now() : false

  // Calculated totals
  const totalUnits = items.reduce((sum, item) => sum + (Number(item?.quantity) || 1), 0)
  const subtotal = Number(cart?.subtotal || 0)
  const discountTotal = Number(cart?.discountTotal || 0)
  const grandTotal = Number(cart?.grandTotal || subtotal - discountTotal)

  const handleCopy = (text: string, setter: (val: boolean) => void) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setter(true)
        setTimeout(() => setter(false), 2000)
      })
    }
  }

  // Customer display strings
  const customerName =
    resolveString(userObj?.displayName) ||
    (userObj?.firstName || userObj?.lastName
      ? `${resolveString(userObj?.firstName)} ${resolveString(userObj?.lastName)}`.trim()
      : resolveString(userObj?.username) || resolveString(userObj?.email) || 'Registered User')

  const customerEmail = resolveString(userObj?.email)
  const customerPhone = resolveString(userObj?.phone)
  const customerRole = resolveString(userObj?.role)
  const customerId = userObj?.id ? String(userObj.id) : null

  // Store display strings
  const storeName = resolveString(storeObj?.name)
  const storeCode = resolveString(storeObj?.code)
  const storeAddressStr = formatAddress(storeObj?.address)
  const storeTier = resolveString(storeObj?.serviceTier)
  const storeId = storeObj?.id ? String(storeObj.id) : null

  // Coupon display string
  const couponCodeStr = resolveString(cart?.couponCode)
  const customerNoteStr = resolveString(cart?.customerNote)

  return (
    <div style={{ maxWidth: 1380, margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top bar StepNav: Home icon / Carts / Cart ID */}
      <SetStepNav
        nav={[
          {
            label: 'Carts',
            url: '/admin/collections/carts',
          },
          {
            label: cartIdStr,
          },
        ]}
      />

      {/* Responsive Styles Injection */}
      <style>{`
        .cart-detail-responsive-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 1.25rem;
        }
        @media (min-width: 1024px) {
          .cart-detail-responsive-grid {
            grid-template-columns: minmax(0, 1fr) 360px;
          }
        }
        .cart-kpi-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.85rem;
          margin-bottom: 1.25rem;
        }
        .cart-item-row:hover {
          background-color: var(--theme-elevation-50, #f8fafc) !important;
        }
      `}</style>

      {/* Top Header Card */}
      <div
        style={{
          background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
          border: '1px solid var(--theme-elevation-150, #e2e8f0)',
          borderRadius: 12,
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        }}
      >
        {/* Navigation breadcrumb & Action bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            paddingBottom: '0.9rem',
            borderBottom: '1px solid var(--theme-elevation-100, #f1f5f9)',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              href="/admin/collections/carts"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--theme-elevation-500, #64748b)',
                textDecoration: 'none',
                padding: '3px 8px',
                borderRadius: 5,
                background: 'var(--theme-elevation-100, #f1f5f9)',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to Carts
            </Link>

            <span style={{ color: 'var(--theme-elevation-300, #cbd5e1)' }}>/</span>

            <span style={{ fontSize: '0.8125rem', color: 'var(--theme-elevation-700, #334155)', fontWeight: 600 }}>
              Cart Details
            </span>
          </div>

          {/* Primary Action Button: Navigates to Payload's native edit form */}
          <Link
            href={`/admin/collections/carts/${cartIdStr}/edit`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.45rem 1rem',
              background: 'var(--bs-primary, #2563eb)',
              color: '#ffffff',
              borderRadius: 6,
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Cart
          </Link>
        </div>

        {/* Main Title & Status Pills */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: '1.45rem',
                  fontWeight: 700,
                  color: 'var(--theme-elevation-900, #0f172a)',
                  letterSpacing: '-0.02em',
                }}
              >
                Shopping Cart
              </h1>

              {/* Cart ID badge with Copy */}
              <button
                type="button"
                onClick={() => handleCopy(cartIdStr, setCopiedId)}
                title="Click to copy full Cart ID"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 9px',
                  background: 'var(--theme-elevation-100, #f1f5f9)',
                  border: '1px solid var(--theme-elevation-200, #e2e8f0)',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  color: 'var(--theme-elevation-700, #475569)',
                  cursor: 'pointer',
                }}
              >
                <span>#{cartIdStr.slice(-8)}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {copiedId && (
                  <span style={{ fontSize: 10, color: 'var(--bs-success, #16a34a)', fontWeight: 600 }}>
                    Copied!
                  </span>
                )}
              </button>

              {/* Cart Type Badge */}
              {isGuest ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 10px',
                    borderRadius: 9999,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: 'rgba(124, 58, 237, 0.1)',
                    color: '#7c3aed',
                    border: '1px solid rgba(124, 58, 237, 0.25)',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Guest Cart
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 10px',
                    borderRadius: 9999,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: 'var(--bs-success-subtle, rgba(21, 128, 61, 0.1))',
                    color: 'var(--bs-success, #15803d)',
                    border: '1px solid var(--bs-success-subtle, rgba(21, 128, 61, 0.25))',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                    <polyline points="16 11 18 13 22 9" />
                  </svg>
                  Registered User
                </span>
              )}

              {/* Expiration Status Badge */}
              {cart?.expiresAt && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 9px',
                    borderRadius: 9999,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: isExpired
                      ? 'var(--bs-error-subtle, rgba(185, 28, 28, 0.1))'
                      : 'var(--theme-elevation-100, #f1f5f9)',
                    color: isExpired
                      ? 'var(--bs-error, #b91c1c)'
                      : 'var(--theme-elevation-700, #475569)',
                    border: isExpired
                      ? '1px solid rgba(185, 28, 28, 0.2)'
                      : '1px solid var(--theme-elevation-200, #e2e8f0)',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: isExpired ? 'var(--bs-error, #b91c1c)' : 'var(--bs-success, #16a34a)',
                    }}
                  />
                  {isExpired ? 'Session Expired' : 'Active Session'}
                </span>
              )}
            </div>

            {/* Sub-meta details */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                marginTop: '0.5rem',
                fontSize: '0.8125rem',
                color: 'var(--theme-elevation-500, #64748b)',
                flexWrap: 'wrap',
              }}
            >
              <span>
                <strong>Created:</strong> {formatDate(cart?.createdAt)}
              </span>
              <span>
                <strong>Last Activity:</strong> {formatRelativeTime(cart?.updatedAt)}
              </span>
              {cart?.expiresAt && (
                <span>
                  <strong>Expires:</strong> {formatDate(cart.expiresAt)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="cart-kpi-strip">
        {/* Metric 1: Grand Total */}
        <div
          style={{
            background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
            border: '1px solid var(--theme-elevation-150, #e2e8f0)',
            borderRadius: 10,
            padding: '1rem 1.15rem',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--theme-elevation-500, #64748b)', marginBottom: 4 }}>
            Estimated Total
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--theme-elevation-900, #0f172a)' }}>
            {formatMoney(grandTotal, currency)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-500, #64748b)', marginTop: 2 }}>
            Subtotal: {formatMoney(subtotal, currency)}
          </div>
        </div>

        {/* Metric 2: Items & Units */}
        <div
          style={{
            background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
            border: '1px solid var(--theme-elevation-150, #e2e8f0)',
            borderRadius: 10,
            padding: '1rem 1.15rem',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--theme-elevation-500, #64748b)', marginBottom: 4 }}>
            Cart Contents
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--theme-elevation-900, #0f172a)' }}>
            {items.length} {items.length === 1 ? 'Product' : 'Products'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-500, #64748b)', marginTop: 2 }}>
            Total quantity: {totalUnits} units
          </div>
        </div>

        {/* Metric 3: Coupon & Discount */}
        <div
          style={{
            background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
            border: '1px solid var(--theme-elevation-150, #e2e8f0)',
            borderRadius: 10,
            padding: '1rem 1.15rem',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--theme-elevation-500, #64748b)', marginBottom: 4 }}>
            Discounts Applied
          </div>
          <div
            style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              color: discountTotal > 0 ? 'var(--bs-success, #16a34a)' : 'var(--theme-elevation-700, #475569)',
            }}
          >
            {discountTotal > 0 ? `-${formatMoney(discountTotal, currency)}` : 'No Discount'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-500, #64748b)', marginTop: 2 }}>
            {couponCodeStr ? `Coupon: ${couponCodeStr}` : 'No promo code attached'}
          </div>
        </div>

      </div>

      {/* Main Two-Column Responsive Layout */}
      <div className="cart-detail-responsive-grid">
        {/* Left Column: Line Items + Financial Breakdown + Customer Note */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Cart Items Table */}
          <div
            style={{
              background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
              border: '1px solid var(--theme-elevation-150, #e2e8f0)',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
                background: 'var(--theme-elevation-50, #f8fafc)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="8" cy="21" r="1" />
                  <circle cx="19" cy="21" r="1" />
                  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                </svg>
                <h2 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--theme-elevation-800, #1e293b)' }}>
                  Cart Items ({items.length})
                </h2>
              </div>

              <span style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-500, #64748b)', fontWeight: 500 }}>
                {totalUnits} {totalUnits === 1 ? 'unit' : 'total units'}
              </span>
            </div>

            {items.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--theme-elevation-500, #64748b)' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5, marginBottom: 8 }}>
                  <circle cx="8" cy="21" r="1" />
                  <circle cx="19" cy="21" r="1" />
                  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                </svg>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--theme-elevation-700, #334155)' }}>
                  This shopping cart is empty
                </div>
                <div style={{ fontSize: '0.8125rem', marginTop: 4 }}>
                  No active line items remain in this session.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 540, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr
                      style={{
                        background: 'var(--theme-elevation-50, #f8fafc)',
                        borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
                        color: 'var(--theme-elevation-600, #475569)',
                        fontWeight: 600,
                      }}
                    >
                      <th style={{ padding: '10px 14px' }}>Product & Details</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Unit Price</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Quantity</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const productObj = typeof item?.product === 'object' && item?.product !== null ? item.product : null
                      const variantObj = typeof item?.variant === 'object' && item?.variant !== null ? item.variant : null
                      const vendorObj = typeof item?.vendor === 'object' && item?.vendor !== null ? item.vendor : null
                      const productId = productObj?.id || (typeof item?.product === 'string' ? item.product : null)

                      const productName = resolveString(productObj?.name || productObj?.title, 'Product Item')
                      const sku = resolveString(variantObj?.sku, '-')
                      const variantTitle = resolveString(variantObj?.title || variantObj?.name)
                      const vendorName = resolveString(vendorObj?.name || vendorObj?.displayName)

                      const unitPrice = Number(item?.unitPrice || 0)
                      const quantity = Number(item?.quantity || 1)
                      const lineTotal = unitPrice * quantity

                      // Resolve thumbnail
                      let imageUrl: string | undefined
                      if (productObj?.images && productObj.images.length > 0) {
                        const first = productObj.images[0]?.image
                        if (typeof first === 'object' && first !== null) {
                          imageUrl = first.sizes?.thumbnail?.url || first.sizes?.card?.url || first.url
                        } else if (typeof first === 'string') {
                          imageUrl = first
                        }
                      }

                      return (
                        <tr
                          key={item?.id || index}
                          className="cart-item-row"
                          style={{
                            borderBottom:
                              index === items.length - 1 ? 'none' : '1px solid var(--theme-elevation-100, #f1f5f9)',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          {/* Product Info */}
                          <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {/* Thumbnail preview */}
                              <div
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 6,
                                  background: 'var(--theme-elevation-100, #f1f5f9)',
                                  border: '1px solid var(--theme-elevation-200, #e2e8f0)',
                                  overflow: 'hidden',
                                  flexShrink: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={productName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                  </svg>
                                )}
                              </div>

                              {/* Title, Variant & Vendor */}
                              <div>
                                {productId ? (
                                  <Link
                                    href={`/admin/collections/products/${productId}`}
                                    style={{
                                      fontWeight: 600,
                                      color: 'var(--theme-elevation-900, #0f172a)',
                                      textDecoration: 'none',
                                    }}
                                  >
                                    {productName}
                                  </Link>
                                ) : (
                                  <span style={{ fontWeight: 600, color: 'var(--theme-elevation-900, #0f172a)' }}>
                                    {productName}
                                  </span>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap', fontSize: 12 }}>
                                  {sku !== '-' && (
                                    <span style={{ color: 'var(--theme-elevation-500, #64748b)', fontFamily: 'monospace' }}>
                                      SKU: {sku}
                                    </span>
                                  )}
                                  {variantTitle && (
                                    <span style={{ color: 'var(--theme-elevation-600, #475569)' }}>
                                      • Variant: <strong>{variantTitle}</strong>
                                    </span>
                                  )}
                                  {vendorName && (
                                    <span
                                      style={{
                                        fontSize: 11,
                                        padding: '1px 6px',
                                        borderRadius: 4,
                                        background: 'var(--theme-elevation-150, #e2e8f0)',
                                        color: 'var(--theme-elevation-700, #334155)',
                                        fontWeight: 500,
                                      }}
                                    >
                                      Vendor: {vendorName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Unit Price */}
                          <td style={{ padding: '12px 14px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 500 }}>
                            {formatMoney(unitPrice, currency)}
                          </td>

                          {/* Quantity */}
                          <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 9px',
                                borderRadius: 12,
                                background: 'var(--theme-elevation-100, #f1f5f9)',
                                border: '1px solid var(--theme-elevation-200, #e2e8f0)',
                                fontWeight: 600,
                                fontSize: 12,
                              }}
                            >
                              {quantity}
                            </span>
                          </td>

                          {/* Line Total */}
                          <td style={{ padding: '12px 14px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 700, color: 'var(--theme-elevation-900, #0f172a)' }}>
                            {formatMoney(lineTotal, currency)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Financial Breakdown Card */}
          <div
            style={{
              background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
              border: '1px solid var(--theme-elevation-150, #e2e8f0)',
              borderRadius: 12,
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            }}
          >
            <h3
              style={{
                margin: '0 0 1rem 0',
                fontSize: '0.875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--theme-elevation-600, #475569)',
              }}
            >
              Order Value Summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--theme-elevation-700, #334155)' }}>
                <span>Subtotal ({totalUnits} items)</span>
                <span style={{ fontWeight: 600 }}>{formatMoney(subtotal, currency)}</span>
              </div>

              {discountTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--bs-success, #16a34a)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span>Coupon Discount</span>
                    {couponCodeStr && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'var(--bs-success-subtle, rgba(21, 128, 61, 0.1))',
                          fontWeight: 600,
                        }}
                      >
                        {couponCodeStr}
                      </span>
                    )}
                  </span>
                  <span style={{ fontWeight: 700 }}>-{formatMoney(discountTotal, currency)}</span>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--theme-elevation-200, #e2e8f0)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--theme-elevation-900, #0f172a)',
                }}
              >
                <span>Estimated Grand Total</span>
                <span style={{ color: 'var(--bs-primary, #2563eb)' }}>
                  {formatMoney(grandTotal, currency)}
                </span>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-500, #64748b)', marginTop: 4 }}>
                * Final shipping charges and tax obligations will be computed when the customer proceeds through the checkout gateway.
              </div>
            </div>
          </div>

          {/* Customer Note Card */}
          <div
            style={{
              background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
              border: '1px solid var(--theme-elevation-150, #e2e8f0)',
              borderRadius: 12,
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.75rem' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <h3
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--theme-elevation-600, #475569)',
                }}
              >
                Customer Note
              </h3>
            </div>

            {customerNoteStr ? (
              <blockquote
                style={{
                  margin: 0,
                  padding: '0.75rem 1rem',
                  background: 'var(--theme-elevation-50, #f8fafc)',
                  borderLeft: '3px solid var(--bs-primary, #2563eb)',
                  borderRadius: '0 8px 8px 0',
                  color: 'var(--theme-elevation-800, #1e293b)',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                "{customerNoteStr}"
              </blockquote>
            ) : (
              <div style={{ fontSize: '0.8125rem', color: 'var(--theme-elevation-500, #64748b)', fontStyle: 'italic' }}>
                No special customer note or delivery instructions attached to this cart session.
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar Column: Customer / Session Info + Store Pickup + Lifecycle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Card 1: Customer / Session Profile */}
          <div
            style={{
              background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
              border: '1px solid var(--theme-elevation-150, #e2e8f0)',
              borderRadius: 12,
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.9rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <h3
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--theme-elevation-600, #475569)',
                }}
              >
                Customer / Session
              </h3>
            </div>

            {userObj ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.85rem' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: 'var(--bs-primary, #2563eb)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  >
                    {customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--theme-elevation-900, #0f172a)' }}>
                      {customerName}
                    </div>
                    {customerRole && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '1px 7px',
                          borderRadius: 9999,
                          background: 'var(--theme-elevation-100, #f1f5f9)',
                          color: 'var(--theme-elevation-700, #334155)',
                          fontWeight: 600,
                        }}
                      >
                        {customerRole.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                  {customerEmail && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--theme-elevation-700, #334155)' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}>
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      <a href={`mailto:${customerEmail}`} style={{ color: 'var(--bs-primary, #2563eb)', textDecoration: 'none' }}>
                        {customerEmail}
                      </a>
                    </div>
                  )}

                  {customerPhone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--theme-elevation-700, #334155)' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}>
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span>{customerPhone}</span>
                    </div>
                  )}
                </div>

                {customerId && (
                  <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--theme-elevation-100, #f1f5f9)' }}>
                    <Link
                      href={`/admin/collections/users/${customerId}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--bs-primary, #2563eb)',
                        textDecoration: 'none',
                      }}
                    >
                      View Customer Account →
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'rgba(124, 58, 237, 0.1)',
                      color: '#7c3aed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--theme-elevation-900, #0f172a)' }}>
                      Guest Visitor
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--theme-elevation-500, #64748b)' }}>
                      Unauthenticated Browser Session
                    </div>
                  </div>
                </div>

                {guestIdStr && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ fontSize: 11, color: 'var(--theme-elevation-500, #64748b)', marginBottom: 2 }}>
                      Guest ID UUID:
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(guestIdStr, setCopiedGuestId)}
                      title="Click to copy Guest ID"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        background: 'var(--theme-elevation-50, #f8fafc)',
                        border: '1px solid var(--theme-elevation-200, #e2e8f0)',
                        borderRadius: 6,
                        fontFamily: 'monospace',
                        fontSize: 11,
                        color: 'var(--theme-elevation-700, #334155)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {guestIdStr}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: copiedGuestId ? 'var(--bs-success, #16a34a)' : '#7c3aed', flexShrink: 0, marginLeft: 6 }}>
                        {copiedGuestId ? 'Copied' : 'Copy'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Customer Order History & Purchasing Activity */}
          <div
            style={{
              background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
              border: '1px solid var(--theme-elevation-150, #e2e8f0)',
              borderRadius: 12,
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--theme-elevation-600, #475569)',
                  }}
                >
                  Order History
                </h3>
              </div>

              {customerOrders.length > 0 && customerId && (
                <Link
                  href={`/admin/collections/orders?where[customer][equals]=${customerId}`}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--bs-primary, #2563eb)',
                    textDecoration: 'none',
                  }}
                >
                  All Orders ({customerMetrics?.totalOrders ?? customerOrders.length}) →
                </Link>
              )}
            </div>

            {/* If Customer has prior orders */}
            {customerOrders && customerOrders.length > 0 ? (
              <div>
                {/* Metric Strip for Customer Lifetime Spend */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    padding: '0.75rem',
                    background: 'var(--theme-elevation-50, #f8fafc)',
                    border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                    borderRadius: 8,
                    marginBottom: '0.85rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 600, color: 'var(--theme-elevation-500, #64748b)' }}>
                      Total Spend
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--theme-elevation-900, #0f172a)', marginTop: 2 }}>
                      {formatMoney(customerMetrics?.totalSpent ?? 0, customerMetrics?.currency || currency)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 600, color: 'var(--theme-elevation-500, #64748b)' }}>
                      Past Orders
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--theme-elevation-900, #0f172a)', marginTop: 2 }}>
                      {customerMetrics?.totalOrders ?? customerOrders.length}
                    </div>
                  </div>
                </div>

                {/* List of Recent Orders */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {customerOrders.slice(0, 5).map((ord) => {
                    const orderNum = resolveString(ord.orderNumber, ord.id?.slice(-8) || 'Order')
                    const orderDate = formatDate(ord.placedAt || ord.createdAt)
                    const orderTotal = Number(ord.grandTotal || 0)
                    const orderCurrency = ord.currency || currency
                    const itemCount = Array.isArray(ord.items) ? ord.items.length : null

                    return (
                      <div
                        key={ord.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          padding: '0.6rem 0.75rem',
                          borderRadius: 8,
                          background: 'var(--theme-elevation-50, #f8fafc)',
                          border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                          fontSize: 12,
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Link
                              href={`/admin/collections/orders/${ord.id}`}
                              style={{
                                fontWeight: 700,
                                color: 'var(--bs-primary, #2563eb)',
                                textDecoration: 'none',
                              }}
                            >
                              #{orderNum}
                            </Link>
                            {ord.status && <StatusPill status={ord.status} type="status" />}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--theme-elevation-500, #64748b)', marginTop: 2 }}>
                            {orderDate} {itemCount !== null && `• ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--theme-elevation-900, #0f172a)' }}>
                            {formatMoney(orderTotal, orderCurrency)}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--theme-elevation-500, #64748b)' }}>
                            {ord.paymentStatus ? formatStatusLabel(ord.paymentStatus) : 'Unpaid'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {customerOrders.length > 5 && customerId && (
                  <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                    <Link
                      href={`/admin/collections/orders?where[customer][equals]=${customerId}`}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--bs-primary, #2563eb)',
                        textDecoration: 'none',
                      }}
                    >
                      View all {customerMetrics?.totalOrders ?? customerOrders.length} orders →
                    </Link>
                  </div>
                )}
              </div>
            ) : isGuest ? (
              <div style={{ fontSize: '0.8125rem', color: 'var(--theme-elevation-500, #64748b)', lineHeight: 1.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--theme-elevation-700, #334155)' }}>
                    Guest Visitor Session
                  </span>
                </div>
                This cart belongs to an unauthenticated visitor. When the guest enters their details and completes checkout, an order record will be permanently attributed to their email and phone.
              </div>
            ) : (
              <div style={{ fontSize: '0.8125rem', color: 'var(--theme-elevation-500, #64748b)', lineHeight: 1.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--theme-elevation-700, #334155)' }}>
                    No Previous Orders Found
                  </span>
                </div>
                This customer has not placed any previous orders. This cart represents their first potential checkout session.
              </div>
            )}
          </div>

          {/* Card 3: Session Health & Lifecycle */}
          <div
            style={{
              background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
              border: '1px solid var(--theme-elevation-150, #e2e8f0)',
              borderRadius: 12,
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.75rem' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <h3
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--theme-elevation-600, #475569)',
                }}
              >
                Session Lifecycle
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--theme-elevation-500, #64748b)' }}>Session Status</span>
                <span
                  style={{
                    fontWeight: 600,
                    color: isExpired ? 'var(--bs-error, #b91c1c)' : 'var(--bs-success, #16a34a)',
                  }}
                >
                  {isExpired ? 'Expired' : 'Active'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--theme-elevation-500, #64748b)' }}>Created</span>
                <span style={{ color: 'var(--theme-elevation-800, #1e293b)' }}>{formatDate(cart?.createdAt)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--theme-elevation-500, #64748b)' }}>Last Updated</span>
                <span style={{ color: 'var(--theme-elevation-800, #1e293b)' }}>{formatDate(cart?.updatedAt)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--theme-elevation-500, #64748b)' }}>Expires</span>
                <span style={{ color: isExpired ? 'var(--bs-error, #b91c1c)' : 'var(--theme-elevation-800, #1e293b)' }}>
                  {cart?.expiresAt ? formatDate(cart.expiresAt) : 'Never (User Cart)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartDetailClient
