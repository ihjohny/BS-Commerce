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
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export function RecentOrdersCard({ orders, currency }: RecentOrdersCardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

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

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid var(--theme-elevation-150)',
        background: 'var(--theme-elevation-0, var(--theme-bg))',
        padding: '1.25rem 1.4rem',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
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
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--theme-text)', letterSpacing: '-0.02em' }}>
            Recent Orders
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--theme-elevation-500)', marginTop: 2 }}>
            Latest orders placed across channels
          </div>
        </div>

        <Link
          href="/admin/collections/orders"
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--bs-primary, #2563eb)',
            textDecoration: 'none',
          }}
        >
          View All &rarr;
        </Link>
      </div>

      {/* Filter Row: Search & Status Filter */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--theme-elevation-150)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            flexWrap: 'wrap',
            padding: 2,
            borderRadius: 7,
            background: 'var(--theme-elevation-100)',
            border: '1px solid var(--theme-elevation-150)',
            gap: 1,
          }}
        >
          {['all', 'pending', 'processing', 'delivered', 'refunded'].map((st) => {
            const isActive = statusFilter === st
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '3px 9px',
                  borderRadius: 5,
                  border: 'none',
                  background: isActive ? 'var(--theme-elevation-0, var(--theme-bg))' : 'transparent',
                  color: isActive ? 'var(--theme-text)' : 'var(--theme-elevation-600)',
                  fontSize: 12,
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
              left: 9,
              color: 'var(--theme-elevation-400)',
              pointerEvents: 'none',
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by Order #, Email, Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '0.35rem 0.65rem 0.35rem 1.85rem',
              borderRadius: 'var(--bs-radius-sm, 6px)',
              border: '1px solid var(--theme-elevation-200)',
              background: 'var(--theme-elevation-0, var(--theme-bg))',
              color: 'var(--theme-text)',
              fontSize: 12.5,
              outline: 'none',
              width: 230,
              boxShadow: 'var(--bs-shadow-xs)',
            }}
          />
        </div>
      </div>

      {/* Orders Table Container */}
      {filteredOrders.length === 0 ? (
        <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400)', fontSize: 13 }}>
          {searchTerm || statusFilter !== 'all' ? 'No orders match this filter.' : 'No recent orders.'}
        </div>
      ) : (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              minWidth: 540,
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: 13,
              tableLayout: 'fixed',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--theme-elevation-150)',
                  color: 'var(--theme-elevation-500)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ width: '24%', padding: '8px 10px', fontWeight: 600 }}>Order #</th>
                <th style={{ width: '30%', padding: '8px 10px', fontWeight: 600 }}>Customer</th>
                <th style={{ width: '18%', padding: '8px 10px', fontWeight: 600 }}>Status</th>
                <th style={{ width: '16%', padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Total</th>
                <th style={{ width: '12%', padding: '8px 10px', fontWeight: 600, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => {
                const customerIdentifier = o.customerPhone || o.customerEmail || o.customerName || 'Guest'

                return (
                  <tr
                    key={o.id}
                    style={{
                      borderBottom: '1px solid var(--theme-elevation-100)',
                      transition: 'background-color 0.12s ease',
                    }}
                  >
                    <td style={{ padding: '10px 10px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <a
                        href={`/admin/collections/orders/${o.id}`}
                        style={{ color: 'var(--bs-primary, #2563eb)', textDecoration: 'none', fontWeight: 600 }}
                        title={o.orderNumber}
                      >
                        {o.orderNumber}
                      </a>
                    </td>
                    <td style={{ padding: '10px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: 'var(--theme-elevation-100)',
                            border: '1px solid var(--theme-elevation-200)',
                            color: 'var(--theme-elevation-600)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                          aria-hidden="true"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                        <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <div
                            style={{ fontWeight: 500, color: 'var(--theme-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={[customerIdentifier, o.customerName, o.customerEmail, o.customerPhone].filter(Boolean).join(' • ')}
                          >
                            {o.customerId ? (
                              <Link
                                href={`/admin/collections/users/${o.customerId}`}
                                style={{
                                  color: 'var(--bs-primary, #2563eb)',
                                  textDecoration: 'none',
                                  fontWeight: 600,
                                  transition: 'color 0.15s ease',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                              >
                                {customerIdentifier}
                              </Link>
                            ) : o.customerEmail || o.customerPhone ? (
                              <Link
                                href={`/admin/collections/users?search=${encodeURIComponent(o.customerEmail || o.customerPhone || '')}`}
                                style={{
                                  color: 'var(--theme-text)',
                                  textDecoration: 'none',
                                  fontWeight: 500,
                                  transition: 'color 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = 'var(--bs-primary, #2563eb)'
                                  e.currentTarget.style.textDecoration = 'underline'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = 'var(--theme-text)'
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
                          <div style={{ fontSize: 11, color: 'var(--theme-elevation-500)' }}>
                            {formatDate(o.createdAt)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <AdminStatusBadge status={o.status} type="order" />
                    </td>
                    <td
                      style={{
                        padding: '10px 10px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: 'var(--theme-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatCurrency(o.grandTotal, o.currency || currency)}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                      <a
                        href={`/admin/collections/orders/${o.id}`}
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: 'var(--theme-text)',
                          textDecoration: 'none',
                          padding: '3px 8px',
                          borderRadius: 'var(--bs-radius-sm, 6px)',
                          background: 'var(--theme-elevation-100)',
                          border: '1px solid var(--theme-elevation-200)',
                          display: 'inline-block',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        View
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
