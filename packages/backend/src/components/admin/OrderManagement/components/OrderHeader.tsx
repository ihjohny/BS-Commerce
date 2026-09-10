'use client'

import React, { useState } from 'react'
import Link from 'next/link'

export type OrderHeaderProps = {
  order: {
    id: string
    orderNumber: string
    status: string
    paymentStatus: string
    checkoutPaymentChannel?: string
    currency: string
    grandTotal: number
    placedAt?: string
    createdAt: string
    updatedAt?: string
  }
  isEditing?: boolean
  onToggleEdit?: () => void
  onStatusChange: (newStatus: string) => Promise<void>
  onEditOrderStatus?: () => void
  onEditPaymentStatus?: () => void
  onPrint: () => void
  updatingStatus: boolean
}

/** Allowed next statuses according to order-status-transitions.ts */
const ORDER_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['partially-shipped', 'shipped', 'cancelled'],
  'partially-shipped': ['shipped'],
  shipped: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
  refunded: [],
}

export function formatStatusLabel(status: string): string {
  return status.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function StatusPill({ status, type = 'order' }: { status: string; type?: 'order' | 'payment' }) {
  const s = status.toLowerCase()
  let color = 'var(--theme-elevation-600, #64748b)'
  let bg = 'var(--theme-elevation-150, rgba(120,120,120,0.12))'

  if (s === 'pending' || s === 'unpaid') {
    color = 'var(--bs-warning, #d97706)'
    bg = 'var(--bs-warning-subtle, rgba(217, 119, 6, 0.12))'
  } else if (s === 'processing') {
    color = 'var(--bs-primary, #2563eb)'
    bg = 'var(--bs-primary-subtle, rgba(37, 99, 235, 0.12))'
  } else if (s === 'shipped' || s === 'partially-shipped') {
    color = '#6366f1'
    bg = 'rgba(99, 102, 241, 0.12)'
  } else if (s === 'delivered' || s === 'completed' || s === 'paid') {
    color = 'var(--bs-success, #16a34a)'
    bg = 'var(--bs-success-subtle, rgba(22, 163, 74, 0.12))'
  } else if (s === 'cancelled' || s === 'refunded') {
    color = 'var(--bs-error, #dc2626)'
    bg = 'var(--bs-error-subtle, rgba(220, 38, 38, 0.12))'
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: '9999px',
        background: bg,
        color: color,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
        }}
      />
      {type === 'payment' ? `Payment: ${formatStatusLabel(status)}` : formatStatusLabel(status)}
    </span>
  )
}

export function OrderHeader({
  order,
  isEditing,
  onToggleEdit,
  onStatusChange,
  onEditOrderStatus,
  onEditPaymentStatus,
  onPrint,
  updatingStatus,
}: OrderHeaderProps) {
  const [copied, setCopied] = useState(false)
  const allowedNext = ORDER_ALLOWED_TRANSITIONS[order.status.toLowerCase()] || []

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(order.orderNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDateWithOrdinal = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return null

    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec',
    ]
    const month = months[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()

    const nth = (d: number) => {
      if (d > 3 && d < 21) return 'th'
      switch (d % 10) {
        case 1: return 'st'
        case 2: return 'nd'
        case 3: return 'rd'
        default: return 'th'
      }
    }

    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    return `${month} ${day}${nth(day)} ${year}, ${time}`
  }

  const createdFormatted = formatDateWithOrdinal(order.createdAt)
  const modifiedFormatted = formatDateWithOrdinal(order.updatedAt || order.createdAt)

  return (
    <div
      className="order-header-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '1.25rem 1.5rem',
        background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
        border: '1px solid var(--theme-elevation-150, #e2e8f0)',
        borderRadius: 12,
        marginBottom: '1.25rem',
      }}
    >
      {/* Top row: Breadcrumb, audit timestamps (Last Modified / Created), and Print Invoice button */}
      <div
        className="order-header-top-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
          color: 'var(--theme-elevation-500, #64748b)',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link
            href="/admin/collections/orders"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: 'var(--bs-primary, #2563eb)',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Orders
          </Link>
          <span>/</span>
          <span style={{ fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>
            {order.orderNumber}
          </span>

          <button
            type="button"
            onClick={handleCopyOrderNumber}
            title={copied ? 'Copied!' : 'Copy Order ID / Number'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: 4,
              color: copied ? 'var(--bs-success, #16a34a)' : 'var(--theme-elevation-500, #94a3b8)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        </div>

        <div className="order-header-top-actions" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Metadata timestamps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12 }}>
            {modifiedFormatted && (
              <span style={{ color: 'var(--theme-elevation-500, #64748b)' }}>
                <strong style={{ color: 'var(--theme-elevation-700, #475569)', fontWeight: 600 }}>Last Modified: </strong>
                {modifiedFormatted}
              </span>
            )}

            {createdFormatted && (
              <span style={{ color: 'var(--theme-elevation-500, #64748b)' }}>
                <strong style={{ color: 'var(--theme-elevation-700, #475569)', fontWeight: 600 }}>Created: </strong>
                {createdFormatted}
              </span>
            )}
          </div>

          {/* Print packing slip / invoice as a clean text button */}
          <button
            type="button"
            onClick={onPrint}
            style={{
              background: 'none',
              border: 'none',
              padding: '2px 4px',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--bs-primary, #2563eb)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              textDecoration: 'none',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print Invoice
          </button>
        </div>
      </div>

      {/* Main header row */}
      <div
        className="order-header-main-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div className="order-header-status-group" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>


          {onEditOrderStatus ? (
            <button
              type="button"
              onClick={onEditOrderStatus}
              title="Click to change Order Status"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <StatusPill status={order.status} type="order" />
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--theme-elevation-500, #64748b)" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
          ) : (
            <StatusPill status={order.status} type="order" />
          )}

          {onEditPaymentStatus ? (
            <button
              type="button"
              onClick={onEditPaymentStatus}
              title="Click to edit Payment Status"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <StatusPill status={order.paymentStatus} type="payment" />
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--theme-elevation-500, #64748b)" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
          ) : (
            <StatusPill status={order.paymentStatus} type="payment" />
          )}
        </div>

        {/* Action buttons toolbar */}
        <div className="order-header-actions-group" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Quick status transition actions */}
          {!isEditing && allowedNext.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {allowedNext.map((next) => {
                const isCancel = next === 'cancelled'
                return (
                  <button
                    key={next}
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => onStatusChange(next)}
                    style={{
                      padding: '7px 13px',
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 8,
                      cursor: updatingStatus ? 'not-allowed' : 'pointer',
                      border: isCancel
                        ? '1px solid var(--bs-error, #dc2626)'
                        : '1px solid var(--bs-primary, #2563eb)',
                      background: isCancel
                        ? 'transparent'
                        : 'var(--bs-primary, #2563eb)',
                      color: isCancel ? 'var(--bs-error, #dc2626)' : '#ffffff',
                      transition: 'all 0.15s ease',
                      opacity: updatingStatus ? 0.6 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {isCancel ? 'Cancel Order' : `Mark as ${formatStatusLabel(next)}`}
                  </button>
                )
              })}
            </div>
          )}

          {/* Edit Order toggle button if provided */}
          {onToggleEdit && (
            <button
              type="button"
              onClick={onToggleEdit}
              style={{
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                cursor: 'pointer',
                border: isEditing
                  ? '1px solid var(--theme-elevation-300, #94a3b8)'
                  : '1px solid var(--theme-elevation-800, #0f172a)',
                background: isEditing
                  ? 'var(--theme-elevation-150, #e2e8f0)'
                  : 'var(--theme-elevation-900, #0f172a)',
                color: isEditing ? 'var(--theme-text, #0f172a)' : '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              {isEditing ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Close Edit Mode
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Edit Order
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
