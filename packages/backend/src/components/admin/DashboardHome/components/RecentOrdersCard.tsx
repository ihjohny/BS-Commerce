'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import type { RecentOrder } from '../../../lib/admin-dashboard-stats'

type RecentOrdersCardProps = {
  orders: RecentOrder[]
  currency: string
}

function formatCurrency(amount: number, currency: string) {
  const symbol = currency === 'BDT' ? '৳' : currency === 'USD' ? '$' : `${currency} `
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase()
  let color = 'var(--theme-elevation-600, #64748b)'
  let bg = 'var(--theme-elevation-150, rgba(120,120,120,0.12))'

  if (s === 'pending') {
    color = 'var(--bs-warning, #d97706)'
    bg = 'var(--bs-warning-subtle, rgba(217, 119, 6, 0.12))'
  } else if (s === 'processing') {
    color = 'var(--bs-primary, #2563eb)'
    bg = 'var(--bs-primary-subtle, rgba(37, 99, 235, 0.12))'
  } else if (s === 'shipped' || s === 'partially-shipped') {
    color = '#6366f1'
    bg = 'rgba(99, 102, 241, 0.12)'
  } else if (s === 'delivered' || s === 'completed') {
    color = 'var(--bs-success, #16a34a)'
    bg = 'var(--bs-success-subtle, rgba(22, 163, 74, 0.12))'
  } else if (s === 'refunded' || s === 'cancelled') {
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
        textTransform: 'capitalize',
        padding: '2px 8px',
        borderRadius: 'var(--bs-radius-full, 9999px)',
        background: bg,
        color: color,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      {status.replace(/-/g, ' ')}
    </span>
  )
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
      const matchSearch =
        !searchTerm.trim() ||
        o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())

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
        borderRadius: 'var(--bs-radius-md, 8px)',
        border: '1px solid var(--theme-elevation-150)',
        background: 'var(--theme-elevation-50)',
        padding: '1.25rem 1.4rem',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        boxShadow: 'var(--bs-shadow-xs)',
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
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--theme-text)', letterSpacing: '-0.01em' }}>
            Recent Orders
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--theme-elevation-500)', marginTop: 2 }}>
            Latest orders placed across channels
          </div>
        </div>

        <Link
          href="/admin/collections/orders"
          style={{
            fontSize: 12.5,
            fontWeight: 600,
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {['all', 'pending', 'processing', 'delivered', 'refunded'].map((st) => {
            const isActive = statusFilter === st
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '3px 9px',
                  borderRadius: 'var(--bs-radius-sm, 6px)',
                  border: 'none',
                  background: isActive ? 'var(--theme-elevation-200)' : 'transparent',
                  color: isActive ? 'var(--theme-text)' : 'var(--theme-elevation-500)',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
              >
                {st}
              </button>
            )
          })}
        </div>

        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search orders…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--bs-radius-sm, 6px)',
              border: '1px solid var(--theme-elevation-200)',
              background: 'var(--theme-elevation-0, #fff)',
              color: 'var(--theme-text)',
              fontSize: 12.5,
              outline: 'none',
              width: 180,
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
                const initials = (o.customerName || 'G')
                  .split(' ')
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()

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
                            background: 'var(--theme-elevation-200)',
                            color: 'var(--theme-elevation-800)',
                            fontSize: 10,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 500, color: 'var(--theme-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.customerName}>
                            {o.customerName}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--theme-elevation-450, #888)' }}>
                            {formatDate(o.createdAt)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <StatusPill status={o.status} />
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
                          transition: 'background-color 0.12s ease',
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
