'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { SetStepNav } from '@payloadcms/ui'

export type CustomerDetailClientProps = {
  customer: {
    id: string
    username?: string | null
    email?: string | null
    phone?: string | null
    firstName?: string | null
    lastName?: string | null
    displayName?: string | null
    role?: string | null
    status?: string | null
    emailVerified?: boolean | null
    phoneVerified?: boolean | null
    locale?: string | null
    createdAt?: string | null
    updatedAt?: string | null
    addresses?: any[] | null
  }
  orders: Array<{
    id: string
    orderNumber: string
    placedAt?: string | null
    createdAt?: string | null
    status: string
    paymentStatus: string
    grandTotal: number
    currency: string
    itemsCount: number
    shippingAddress?: {
      firstName?: string | null
      lastName?: string | null
      street1?: string | null
      street2?: string | null
      city?: string | null
      state?: string | null
      postalCode?: string | null
      country?: string | null
      phone?: string | null
    } | null
    deviceTracking?: {
      ipAddress?: string | null
      userAgent?: string | null
      deviceType?: string | null
      browser?: string | null
      os?: string | null
      referrer?: string | null
    } | null
  }>
  metrics: {
    totalOrders: number
    totalSpent: number
    averageOrderValue: number
    firstOrderDate: string | null
    lastOrderDate: string | null
    completedOrdersCount: number
  }
  currency: string
}

function formatCurrency(amount: number, currency: string) {
  const symbol = currency === 'BDT' ? '৳' : currency === 'USD' ? '$' : `${currency} `
  const num = Number(amount || 0)
  const hasDecimals = num % 1 !== 0
  return `${symbol}${num.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}

function formatDateWithOrdinal(dateString?: string | null) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return String(dateString)

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

function formatRelativeDate(iso?: string | null) {
  if (!iso) return 'N/A'
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 30) return `${diffDays} days ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  } catch {
    return iso
  }
}

import { AdminStatusBadge, AdminKpiCard } from '../ui'

function formatStatusLabel(status: string): string {
  return status.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const StatusPill = AdminStatusBadge

export function CustomerDetailClient({
  customer,
  orders,
  metrics,
  currency,
}: CustomerDetailClientProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [orderSearch, setOrderSearch] = useState('')
  const [isDeviceAuditOpen, setIsDeviceAuditOpen] = useState(true)

  const fullName =
    customer.displayName ||
    [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
    customer.username ||
    'Customer Account'

  const initials =
    fullName
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'CU'

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (!orderSearch.trim()) return true
    const term = orderSearch.toLowerCase()
    return (
      o.orderNumber.toLowerCase().includes(term) ||
      o.status.toLowerCase().includes(term) ||
      o.paymentStatus.toLowerCase().includes(term)
    )
  })

  // Aggregate unique device audit data
  const devices = Array.from(
    new Set(
      orders
        .map((o) => o.deviceTracking?.deviceType)
        .filter(Boolean) as string[]
    )
  )
  const browsers = Array.from(
    new Set(
      orders
        .map((o) => o.deviceTracking?.browser)
        .filter(Boolean) as string[]
    )
  )
  const osList = Array.from(
    new Set(
      orders
        .map((o) => o.deviceTracking?.os)
        .filter(Boolean) as string[]
    )
  )
  const ipList = Array.from(
    new Set(
      orders
        .map((o) => o.deviceTracking?.ipAddress)
        .filter(Boolean) as string[]
    )
  )

  // Aggregate addresses from orders
  const addressesFromOrders = orders
    .map((o) => o.shippingAddress)
    .filter(Boolean)
    .filter(
      (addr, idx, arr) =>
        arr.findIndex(
          (a) =>
            a?.street1 === addr?.street1 &&
            a?.city === addr?.city &&
            a?.postalCode === addr?.postalCode
        ) === idx
    )

  const createdFormatted = formatDateWithOrdinal(customer.createdAt)
  const modifiedFormatted = formatDateWithOrdinal(customer.updatedAt || customer.createdAt)

  return (
    <div
      style={{
        maxWidth: 1300,
        margin: '0 auto',
        padding: '0 0.5rem 1.5rem 0.5rem',
        color: 'var(--theme-text, #0f172a)',
        fontFamily: 'var(--font-body, system-ui, -apple-system, sans-serif)',
      }}
    >
      {/* Top bar StepNav: Users / Customer Name */}
      <SetStepNav
        nav={[
          {
            label: 'Users',
            url: '/admin/collections/users',
          },
          {
            label: fullName,
          },
        ]}
      />

      {/* Main Customer Header Card - Exact Match with OrderHeader style */}
      <div
        className="order-header-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          padding: '1.25rem 1.5rem',
          background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
          border: '1px solid var(--theme-elevation-150, #e2e8f0)',
          borderRadius: 12,
          marginBottom: '1rem',
        }}
      >
        {/* Top row: Breadcrumb, audit timestamps, and Edit Customer action */}
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
              href="/admin/collections/users"
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
              Back to Users
            </Link>
            <span>/</span>
            <span style={{ fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>
              {customer.phone || customer.email || customer.username || customer.id}
            </span>

            <button
              type="button"
              onClick={() => handleCopy(customer.phone || customer.email || customer.username || customer.id, 'header-id')}
              title={copiedKey === 'header-id' ? 'Copied!' : 'Copy User Identifier'}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: 4,
                color: copiedKey === 'header-id' ? 'var(--bs-success, #16a34a)' : 'var(--theme-elevation-500, #94a3b8)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              {copiedKey === 'header-id' ? (
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
            {/* Timestamps */}
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

            {/* Dedicated Edit User Action */}
            <Link
              href={`/admin/collections/users/${customer.id}/edit`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                background: 'var(--bs-primary, #2563eb)',
                color: '#ffffff',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bs-primary-hover, #1d4ed8)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bs-primary, #2563eb)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit User
            </Link>
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
            gap: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Customer Initials Badge */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--bs-primary, #2563eb)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 15,
                flexShrink: 0,
                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
              }}
            >
              {initials}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: 'var(--theme-text, #0f172a)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {fullName}
                </h1>
                <StatusPill status={customer.status || 'active'} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: 9999,
                    background: 'var(--theme-elevation-150, #e2e8f0)',
                    color: 'var(--theme-elevation-700, #334155)',
                  }}
                >
                  {customer.role || 'customer'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginTop: 4,
                  fontSize: 12,
                  color: 'var(--theme-elevation-500, #64748b)',
                  flexWrap: 'wrap',
                }}
              >
                {customer.email && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    {customer.email}
                  </span>
                )}

                {customer.phone && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {customer.phone}
                  </span>
                )}

                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Customer since {formatRelativeDate(customer.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Verification Badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 6,
                background: customer.emailVerified ? 'var(--bs-success-subtle, rgba(22, 163, 74, 0.12))' : 'var(--theme-elevation-150, #f1f5f9)',
                color: customer.emailVerified ? 'var(--bs-success, #16a34a)' : 'var(--theme-elevation-600, #64748b)',
                border: `1px solid ${customer.emailVerified ? 'rgba(22, 163, 74, 0.25)' : 'var(--theme-elevation-200, #e2e8f0)'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {customer.emailVerified ? '✓ Email Verified' : '○ Email Unverified'}
            </span>

            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 6,
                background: customer.phoneVerified ? 'var(--bs-success-subtle, rgba(22, 163, 74, 0.12))' : 'var(--theme-elevation-150, #f1f5f9)',
                color: customer.phoneVerified ? 'var(--bs-success, #16a34a)' : 'var(--theme-elevation-600, #64748b)',
                border: `1px solid ${customer.phoneVerified ? 'rgba(22, 163, 74, 0.25)' : 'var(--theme-elevation-200, #e2e8f0)'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {customer.phoneVerified ? '✓ Phone Verified' : '○ Phone Unverified'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Ribbon - Standardized with AdminKpiCard */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1rem',
        }}
      >
        <AdminKpiCard
          label="Lifetime Value (LTV)"
          value={formatCurrency(metrics.totalSpent, currency)}
          sublabel={`Total spend across ${metrics.totalOrders} order${metrics.totalOrders === 1 ? '' : 's'}`}
          compact
        />

        <AdminKpiCard
          label="Total Orders"
          value={metrics.totalOrders}
          sublabel={<span style={{ color: 'var(--bs-success, #16a34a)', fontWeight: 500 }}>{metrics.completedOrdersCount} completed / fulfilled</span>}
          compact
        />

        <AdminKpiCard
          label="Average Order Value (AOV)"
          value={formatCurrency(metrics.averageOrderValue, currency)}
          sublabel="Average basket size"
          compact
        />

        <AdminKpiCard
          label="Last Order Placed"
          value={metrics.lastOrderDate ? formatRelativeDate(metrics.lastOrderDate) : 'No Orders'}
          sublabel={metrics.lastOrderDate ? formatDateWithOrdinal(metrics.lastOrderDate) : 'First order pending'}
          compact
        />
      </div>

      {/* 1. Full-Width Order History Card */}
      <div
        className="customer-full-width-orders"
        style={{
          background: 'var(--theme-elevation-0, #ffffff)',
          border: '1px solid var(--theme-elevation-150, #e2e8f0)',
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: '1rem',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--theme-text, #0f172a)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            Order History ({orders.length})
          </h2>

          {orders.length > 2 && (
            <input
              type="text"
              placeholder="Filter customer orders..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 6,
                border: '1px solid var(--theme-elevation-200, #e2e8f0)',
                background: 'var(--theme-elevation-50, #f8fafc)',
                color: 'var(--theme-text, #0f172a)',
                fontSize: 12,
                outline: 'none',
                width: 220,
              }}
            />
          )}
        </div>

        {filteredOrders.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '2.5rem 1rem',
              color: 'var(--theme-elevation-500, #64748b)',
              fontSize: 13,
            }}
          >
            {orderSearch ? 'No orders match your filter term.' : 'No orders found for this customer.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                minWidth: 700,
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: 'var(--theme-elevation-50, #f8fafc)',
                    borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
                    color: 'var(--theme-elevation-600, #475569)',
                    fontWeight: 600,
                  }}
                >
                  <th style={{ padding: '8px 14px' }}>Order #</th>
                  <th style={{ padding: '8px 14px' }}>Date Placed</th>
                  <th style={{ padding: '8px 14px' }}>Items</th>
                  <th style={{ padding: '8px 14px', textAlign: 'right' }}>Total Amount</th>
                  <th style={{ padding: '8px 14px' }}>Payment Status</th>
                  <th style={{ padding: '8px 14px' }}>Fulfillment Status</th>
                  <th style={{ padding: '8px 14px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr
                    key={o.id}
                    style={{
                      borderBottom: '1px solid var(--theme-elevation-100, #f1f5f9)',
                      transition: 'background-color 0.12s ease',
                    }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                      <Link
                        href={`/admin/collections/orders/${o.id}`}
                        style={{
                          color: 'var(--bs-primary, #2563eb)',
                          textDecoration: 'none',
                          fontWeight: 600,
                        }}
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--theme-elevation-600, #475569)', whiteSpace: 'nowrap' }}>
                      {formatDateWithOrdinal(o.placedAt || o.createdAt)}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--theme-elevation-700, #334155)' }}>
                      {o.itemsCount} item{o.itemsCount === 1 ? '' : 's'}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {formatCurrency(o.grandTotal, o.currency || currency)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <StatusPill status={o.paymentStatus} type="payment" />
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <StatusPill status={o.status} type="status" />
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <Link
                        href={`/admin/collections/orders/${o.id}`}
                        className="customer-order-view-btn"
                        title={`View Order ${o.orderNumber}`}
                      >
                        <span className="customer-order-view-btn-text">View Order</span>
                        <span className="customer-order-view-btn-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                          </svg>
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Below Order History: 2-Column Balanced Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Customer Profile + Device & Activity Intelligence immediately below */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Customer Profile Card */}
          <div
            style={{
              background: 'var(--theme-elevation-0, #ffffff)',
              border: '1px solid var(--theme-elevation-150, #e2e8f0)',
              borderRadius: 12,
              padding: '1.25rem',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div
              style={{
                borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
                paddingBottom: '0.65rem',
                marginBottom: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: 'var(--theme-text, #0f172a)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Customer Profile
              </h2>

              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'var(--bs-primary-subtle, rgba(37, 99, 235, 0.12))',
                  color: 'var(--bs-primary, #2563eb)',
                }}
              >
                Registered User
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              {/* Email row */}
              {customer.email && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--theme-elevation-400, #94a3b8)" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <a
                      href={`mailto:${customer.email}`}
                      style={{
                        color: 'var(--theme-text, #0f172a)',
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                    >
                      {customer.email}
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(customer.email!, 'email')}
                    title="Copy Email"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 11,
                      color: copiedKey === 'email' ? 'var(--bs-success, #16a34a)' : 'var(--theme-elevation-500, #64748b)',
                    }}
                  >
                    {copiedKey === 'email' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}

              {/* Phone row */}
              {customer.phone && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--theme-elevation-400, #94a3b8)" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <a
                      href={`tel:${customer.phone}`}
                      style={{
                        color: 'var(--theme-text, #0f172a)',
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                    >
                      {customer.phone}
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(customer.phone!, 'phone')}
                    title="Copy Phone"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 11,
                      color: copiedKey === 'phone' ? 'var(--bs-success, #16a34a)' : 'var(--theme-elevation-500, #64748b)',
                    }}
                  >
                    {copiedKey === 'phone' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}

              {/* Username row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--theme-elevation-400, #94a3b8)" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  <span style={{ color: 'var(--theme-elevation-600, #64748b)' }}>Username:</span>
                  <span style={{ fontWeight: 600, color: 'var(--theme-text, #0f172a)', fontFamily: 'monospace' }}>
                    {customer.username || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Preferred Language */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--theme-elevation-400, #94a3b8)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <span style={{ color: 'var(--theme-elevation-600, #64748b)' }}>Language:</span>
                  <span style={{ fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>
                    {customer.locale === 'bn' ? 'বাংলা (Bengali)' : 'English (en)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Device & Activity Intelligence Card (Immediately below Customer Profile) */}
          <div
            style={{
              background: 'var(--theme-elevation-0, #ffffff)',
              border: '1px solid var(--theme-elevation-150, #e2e8f0)',
              borderRadius: 12,
              padding: '1.25rem',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
            }}
          >
            <button
              type="button"
              onClick={() => setIsDeviceAuditOpen(!isDeviceAuditOpen)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>
                  Device & Activity Intelligence
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--theme-elevation-500, #64748b)', fontSize: 12 }}>
                <span>{isDeviceAuditOpen ? 'Hide Details' : 'Show Details'}</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{
                    transform: isDeviceAuditOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </button>

            {isDeviceAuditOpen && (
              <div
                style={{
                  marginTop: '0.85rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--theme-elevation-150, #e2e8f0)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '0.65rem',
                  }}
                >
                  <div style={{ background: 'var(--theme-elevation-50, #f8fafc)', padding: '0.65rem 0.75rem', borderRadius: 8, border: '1px solid var(--theme-elevation-150, #e2e8f0)' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--theme-elevation-500, #64748b)', fontWeight: 600 }}>
                      Primary Devices
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, textTransform: 'capitalize', color: 'var(--theme-text, #0f172a)', wordBreak: 'break-word' }}>
                      {devices.length > 0 ? devices.join(', ') : 'None detected'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--theme-elevation-50, #f8fafc)', padding: '0.65rem 0.75rem', borderRadius: 8, border: '1px solid var(--theme-elevation-150, #e2e8f0)' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--theme-elevation-500, #64748b)', fontWeight: 600 }}>
                      Browsers Used
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color: 'var(--theme-text, #0f172a)', wordBreak: 'break-word' }}>
                      {browsers.length > 0 ? browsers.join(', ') : 'None detected'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--theme-elevation-50, #f8fafc)', padding: '0.65rem 0.75rem', borderRadius: 8, border: '1px solid var(--theme-elevation-150, #e2e8f0)' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--theme-elevation-500, #64748b)', fontWeight: 600 }}>
                      Operating Systems
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color: 'var(--theme-text, #0f172a)', wordBreak: 'break-word' }}>
                      {osList.length > 0 ? osList.join(', ') : 'None detected'}
                    </div>
                  </div>
                </div>

                {/* Last Known IP Box - dedicated row below so long IPv6/IPv4-mapped addresses never overlap */}
                <div
                  style={{
                    background: 'var(--theme-elevation-50, #f8fafc)',
                    padding: '0.65rem 0.75rem',
                    borderRadius: 8,
                    border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--theme-elevation-500, #64748b)', fontWeight: 600 }}>
                    Last Known IP Address
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: 'monospace',
                      color: 'var(--theme-text, #0f172a)',
                      wordBreak: 'break-all',
                      background: 'var(--theme-elevation-100, #e2e8f0)',
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {ipList.length > 0 ? ipList[0] : 'None detected'}
                  </div>
                </div>

                {orders.length > 0 && orders[0]?.deviceTracking?.userAgent && (
                  <div style={{ background: 'var(--theme-elevation-50, #f8fafc)', padding: '0.65rem 0.75rem', borderRadius: 8, border: '1px solid var(--theme-elevation-150, #e2e8f0)' }}>
                    <div style={{ fontSize: 11, color: 'var(--theme-elevation-500, #64748b)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                      Checkout User Agent Signature:
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--theme-elevation-700, #334155)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {orders[0].deviceTracking.userAgent}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Fulfillment & Addresses + Account Audit & Security */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Saved & Delivery Addresses Card */}
          <div
            style={{
              background: 'var(--theme-elevation-0, #ffffff)',
              border: '1px solid var(--theme-elevation-150, #e2e8f0)',
              borderRadius: 12,
              padding: '1.25rem',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div
              style={{
                borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
                paddingBottom: '0.65rem',
                marginBottom: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: 'var(--theme-text, #0f172a)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                Fulfillment & Addresses
              </h2>
            </div>

            {addressesFromOrders.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--theme-elevation-500, #64748b)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                No delivery addresses recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {addressesFromOrders.map((addr, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--theme-elevation-50, #f8fafc)',
                      padding: '0.75rem 0.95rem',
                      borderRadius: 8,
                      border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                      fontSize: 13,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--theme-text, #0f172a)', marginBottom: 3 }}>
                      {[addr?.firstName, addr?.lastName].filter(Boolean).join(' ') || 'Delivery Address'}
                    </div>
                    <div style={{ color: 'var(--theme-elevation-700, #475569)', lineHeight: 1.45 }}>
                      {addr?.street1}
                      {addr?.street2 ? `, ${addr.street2}` : ''}
                      <br />
                      {[addr?.city, addr?.state, addr?.postalCode].filter(Boolean).join(', ')}
                      <br />
                      {addr?.country || 'Bangladesh'}
                    </div>
                    {addr?.phone && (
                      <div style={{ fontSize: 12, color: 'var(--theme-elevation-600, #64748b)', marginTop: 5 }}>
                        📞 {addr.phone}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Account Audit & Security Card */}
          <div
            style={{
              background: 'var(--theme-elevation-0, #ffffff)',
              border: '1px solid var(--theme-elevation-150, #e2e8f0)',
              borderRadius: 12,
              padding: '1.25rem',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div
              style={{
                borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
                paddingBottom: '0.65rem',
                marginBottom: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: 'var(--theme-text, #0f172a)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Account Audit & Security
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--theme-elevation-500, #64748b)' }}>Registered:</span>
                <span style={{ fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>
                  {formatDateWithOrdinal(customer.createdAt)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--theme-elevation-500, #64748b)' }}>Last Updated:</span>
                <span style={{ fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>
                  {formatDateWithOrdinal(customer.updatedAt || customer.createdAt)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--theme-elevation-500, #64748b)' }}>Auth Identifier:</span>
                <span style={{ fontWeight: 600, color: 'var(--theme-text, #0f172a)', fontFamily: 'monospace' }}>
                  {customer.username || 'email/phone'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerDetailClient
