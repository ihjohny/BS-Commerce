'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import type { RecentOrder } from '../../../../lib/admin-dashboard-stats'
import { AdminStatusBadge } from '../../ui'

type RecentOrdersCardProps = {
  orders: RecentOrder[]
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

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }
  } catch {
    return { date: iso, time: '' }
  }
}

export function RecentOrdersCard({ orders, currency }: RecentOrdersCardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null)

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const term = searchTerm.trim().toLowerCase()
      const termDigits = term.replace(/\D/g, '')
      const phoneDigits = (o.customerPhone || '').replace(/\D/g, '')

      const matchPhone =
        Boolean(o.customerPhone && o.customerPhone.toLowerCase().includes(term)) ||
        Boolean(termDigits.length >= 3 && phoneDigits.includes(termDigits))

      const matchSearch =
        !term ||
        o.orderNumber.toLowerCase().includes(term) ||
        o.customerName.toLowerCase().includes(term) ||
        o.customerEmail.toLowerCase().includes(term) ||
        matchPhone

      const matchStatus =
        statusFilter === 'all' ||
        o.status.toLowerCase() === statusFilter.toLowerCase() ||
        (statusFilter === 'delivered' && (o.status === 'delivered' || o.status === 'completed'))

      return matchSearch && matchStatus
    })
  }, [orders, searchTerm, statusFilter])

  const handleCopyOrderNumber = (e: React.MouseEvent, orderNumber: string) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(orderNumber)
    setCopiedOrderId(orderNumber)
    setTimeout(() => {
      setCopiedOrderId(null)
    }, 1800)
  }

  return (
    <div
      style={{
        borderRadius: 'var(--bs-radius-lg, 12px)',
        border: '1px solid var(--theme-elevation-150, #e2e8f0)',
        background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        boxShadow: 'var(--bs-shadow-xs, 0 1px 2px 0 rgba(0, 0, 0, 0.03))',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          marginBottom: '1rem',
        }}
      >
        <div>
          <div style={{ fontSize: 'var(--bs-font-md, 0.9375rem)', fontWeight: 600, color: 'var(--theme-text, #0f172a)', letterSpacing: '-0.015em' }}>
            Recent Orders
          </div>
          <div style={{ fontSize: 'var(--bs-font-sm, 0.8125rem)', color: 'var(--theme-elevation-500, #64748b)', marginTop: 2 }}>
            Latest orders placed across channels
          </div>
        </div>

        <Link
          href="/admin/collections/orders"
          style={{
            fontSize: 'var(--bs-font-sm, 0.8125rem)',
            fontWeight: 600,
            color: 'var(--bs-primary, #2563eb)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>View All Orders</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {/* Filter Toolbar: Status Chips & Quick Search */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: '1rem',
          paddingBottom: '0.85rem',
          borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            flexWrap: 'wrap',
            padding: 2,
            borderRadius: 'var(--bs-radius-sm, 7px)',
            background: 'var(--theme-elevation-100, #f1f5f9)',
            border: '1px solid var(--theme-elevation-150, #e2e8f0)',
            gap: 2,
          }}
        >
          {['all', 'pending', 'processing', 'delivered', 'refunded'].map((st) => {
            const isActive = statusFilter === st
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '4px 11px',
                  borderRadius: 'var(--bs-radius-xs, 5px)',
                  border: 'none',
                  background: isActive ? 'var(--theme-elevation-0, #ffffff)' : 'transparent',
                  color: isActive ? 'var(--theme-text, #0f172a)' : 'var(--theme-elevation-600, #64748b)',
                  fontSize: 'var(--bs-font-sm, 0.8125rem)',
                  fontWeight: isActive ? 600 : 500,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 1px 2px rgba(0, 0, 0, 0.06)' : 'none',
                  transition: 'all 0.12s ease',
                }}
              >
                {st}
              </button>
            )
          })}
        </div>

        {/* Search Field */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: 'absolute',
              left: 10,
              color: 'var(--theme-elevation-400, #94a3b8)',
              pointerEvents: 'none',
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search order #, customer, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '0.42rem 0.75rem 0.42rem 2.1rem',
              borderRadius: 'var(--bs-radius-sm, 6px)',
              border: '1px solid var(--theme-elevation-200, #cbd5e1)',
              background: 'var(--theme-elevation-0, #ffffff)',
              color: 'var(--theme-text, #0f172a)',
              fontSize: 'var(--bs-font-sm, 0.8125rem)',
              outline: 'none',
              width: 260,
              boxShadow: 'var(--bs-shadow-xs)',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--bs-primary, #2563eb)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--theme-elevation-200, #cbd5e1)')}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: 6,
                background: 'transparent',
                border: 'none',
                color: 'var(--theme-elevation-400)',
                cursor: 'pointer',
                fontSize: 14,
                padding: '2px 4px',
              }}
              title="Clear search"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Orders Table Container */}
      {filteredOrders.length === 0 ? (
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400, #94a3b8)', fontSize: 'var(--bs-font-sm, 0.8125rem)' }}>
          {searchTerm || statusFilter !== 'all' ? 'No orders match this filter.' : 'No recent orders recorded.'}
        </div>
      ) : (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              minWidth: 640,
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: 'var(--bs-font-base, 0.875rem)',
              tableLayout: 'fixed',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
                  color: 'var(--theme-elevation-500, #64748b)',
                  fontSize: 'var(--bs-font-xs, 0.75rem)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <th style={{ width: '22%', padding: '8px 10px', fontWeight: 600 }}>Order #</th>
                <th style={{ width: '18%', padding: '8px 10px', fontWeight: 600 }}>Placed</th>
                <th style={{ width: '28%', padding: '8px 10px', fontWeight: 600 }}>Customer</th>
                <th style={{ width: '14%', padding: '8px 10px', fontWeight: 600 }}>Status</th>
                <th style={{ width: '18%', padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => {
                const customerIdentifier = o.customerPhone || o.customerEmail || o.customerName || 'Guest'
                const { date: formattedDateText, time: formattedTimeText } = formatDate(o.createdAt)
                const isCopied = copiedOrderId === o.orderNumber

                return (
                  <tr
                    key={o.id}
                    style={{
                      borderBottom: '1px solid var(--theme-elevation-100, #f1f5f9)',
                      transition: 'background-color 0.12s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--theme-elevation-50, #f8fafc)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Order Number + Copy Button */}
                    <td style={{ padding: '10px 10px', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <a
                          href={`/admin/collections/orders/${o.id}`}
                          style={{
                            color: 'var(--bs-primary, #2563eb)',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={o.orderNumber}
                        >
                          {o.orderNumber}
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleCopyOrderNumber(e, o.orderNumber)}
                          title={isCopied ? 'Copied!' : 'Copy order number'}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '2px 4px',
                            cursor: 'pointer',
                            color: isCopied ? 'var(--bs-success, #16a34a)' : 'var(--theme-elevation-400, #94a3b8)',
                            borderRadius: 3,
                            display: 'inline-flex',
                            alignItems: 'center',
                            transition: 'color 0.12s ease',
                          }}
                        >
                          {isCopied ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Placed Date & Time */}
                    <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ color: 'var(--theme-text, #0f172a)', fontWeight: 500 }}>
                        {formattedDateText}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--theme-elevation-450, #64748b)' }}>
                        {formattedTimeText}
                      </div>
                    </td>

                    {/* Customer */}
                    <td style={{ padding: '10px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'var(--theme-elevation-100, #f1f5f9)',
                            border: '1px solid var(--theme-elevation-200, #cbd5e1)',
                            color: 'var(--theme-elevation-600, #64748b)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                          aria-hidden="true"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                        <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <div
                            style={{ fontWeight: 500, color: 'var(--theme-text, #0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={[customerIdentifier, o.customerName, o.customerEmail, o.customerPhone].filter(Boolean).join(' • ')}
                          >
                            {o.customerId ? (
                              <Link
                                href={`/admin/collections/users/${o.customerId}`}
                                style={{
                                  color: 'var(--theme-text, #0f172a)',
                                  textDecoration: 'none',
                                  fontWeight: 500,
                                  transition: 'color 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = 'var(--bs-primary, #2563eb)'
                                  e.currentTarget.style.textDecoration = 'underline'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = 'var(--theme-text, #0f172a)'
                                  e.currentTarget.style.textDecoration = 'none'
                                }}
                              >
                                {customerIdentifier}
                              </Link>
                            ) : o.customerEmail || o.customerPhone ? (
                              <Link
                                href={`/admin/collections/users?search=${encodeURIComponent(o.customerEmail || o.customerPhone || '')}`}
                                style={{
                                  color: 'var(--theme-text, #0f172a)',
                                  textDecoration: 'none',
                                  fontWeight: 500,
                                  transition: 'color 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = 'var(--bs-primary, #2563eb)'
                                  e.currentTarget.style.textDecoration = 'underline'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = 'var(--theme-text, #0f172a)'
                                  e.currentTarget.style.textDecoration = 'none'
                                }}
                                title="Search for customer account"
                              >
                                {customerIdentifier}
                              </Link>
                            ) : (
                              <span>{customerIdentifier}</span>
                            )}
                          </div>
                          {o.customerName && o.customerName !== customerIdentifier && (
                            <div style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', color: 'var(--theme-elevation-500, #64748b)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {o.customerName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Order Status */}
                    <td style={{ padding: '10px 10px' }}>
                      <AdminStatusBadge status={o.status} type="order" />
                    </td>

                    {/* Total Amount + Action view */}
                    <td
                      style={{
                        padding: '10px 10px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: 'var(--theme-text, #0f172a)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      <div style={{ fontSize: 'var(--bs-font-base, 0.875rem)' }}>
                        {formatCurrency(o.grandTotal, o.currency || currency)}
                      </div>
                      <a
                        href={`/admin/collections/orders/${o.id}`}
                        style={{
                          fontSize: 'var(--bs-font-xs, 0.75rem)',
                          color: 'var(--bs-primary, #2563eb)',
                          textDecoration: 'none',
                          fontWeight: 500,
                          marginTop: 2,
                          display: 'inline-block',
                        }}
                      >
                        Details &rarr;
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

