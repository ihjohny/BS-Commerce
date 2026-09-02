'use client'

import React, { useState, useMemo } from 'react'
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
  let color = 'var(--theme-elevation-600, #555)'
  let bg = 'var(--theme-elevation-150, rgba(120,120,120,0.15))'

  if (s === 'pending') {
    color = 'var(--theme-warning-500, #d97706)'
    bg = 'rgba(217, 119, 6, 0.12)'
  } else if (s === 'processing') {
    color = 'var(--theme-text)'
    bg = 'var(--theme-elevation-200)'
  } else if (s === 'shipped' || s === 'partially-shipped') {
    color = 'var(--theme-text)'
    bg = 'var(--theme-elevation-200)'
  } else if (s === 'delivered' || s === 'completed') {
    color = 'var(--theme-success-500, #16a34a)'
    bg = 'rgba(22, 163, 74, 0.12)'
  } else if (s === 'refunded') {
    color = 'var(--theme-error-500, #dc2626)'
    bg = 'rgba(220, 38, 38, 0.12)'
  }

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'capitalize',
        padding: '2px 7px',
        borderRadius: 4,
        background: bg,
        color: color,
        whiteSpace: 'nowrap',
      }}
    >
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
        borderRadius: 8,
        border: '1px solid var(--theme-elevation-200)',
        background: 'var(--theme-elevation-50)',
        padding: '1.25rem 1.4rem',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
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
          marginBottom: '0.85rem',
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--theme-text)' }}>
            Recent Orders
          </div>
          <div style={{ fontSize: 12, color: 'var(--theme-elevation-500)', marginTop: 2 }}>
            Latest orders placed across channels
          </div>
        </div>

        <a
          href="/admin/collections/orders"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--theme-text)',
            textDecoration: 'none',
          }}
        >
          View All &rarr;
        </a>
      </div>

      {/* Filter Row: Search & Status Filter */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: '0.85rem',
          paddingBottom: '0.65rem',
          borderBottom: '1px solid var(--theme-elevation-150, rgba(120,120,120,0.1))',
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
                  padding: '3px 8px',
                  borderRadius: 4,
                  border: 'none',
                  background: isActive ? 'var(--theme-elevation-200)' : 'transparent',
                  color: isActive ? 'var(--theme-text)' : 'var(--theme-elevation-500)',
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 500,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                }}
              >
                {st}
              </button>
            )
          })}
        </div>

        <input
          type="text"
          placeholder="Filter orders…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '0.3rem 0.6rem',
            borderRadius: 4,
            border: '1px solid var(--theme-elevation-200)',
            background: 'var(--theme-elevation-100)',
            color: 'var(--theme-text)',
            fontSize: 12,
            outline: 'none',
            maxWidth: 180,
          }}
        />
      </div>

      {/* Orders Table Container */}
      {filteredOrders.length === 0 ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400)', fontSize: 13 }}>
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
              fontSize: 12,
              tableLayout: 'fixed',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--theme-elevation-200)',
                  color: 'var(--theme-elevation-500)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ width: '22%', padding: '6px 8px', fontWeight: 600 }}>Order #</th>
                <th style={{ width: '28%', padding: '6px 8px', fontWeight: 600 }}>Customer</th>
                <th style={{ width: '20%', padding: '6px 8px', fontWeight: 600 }}>Status</th>
                <th style={{ width: '18%', padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Total</th>
                <th style={{ width: '12%', padding: '6px 8px', fontWeight: 600, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr
                  key={o.id}
                  style={{
                    borderBottom: '1px solid var(--theme-elevation-150, rgba(120,120,120,0.08))',
                  }}
                >
                  <td style={{ padding: '8px 8px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <a
                      href={`/admin/collections/orders/${o.id}`}
                      style={{ color: 'var(--theme-text)', textDecoration: 'none' }}
                      title={o.orderNumber}
                    >
                      {o.orderNumber}
                    </a>
                  </td>
                  <td style={{ padding: '8px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 500, color: 'var(--theme-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.customerName}>
                      {o.customerName}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--theme-elevation-450, #888)' }}>
                      {formatDate(o.createdAt)}
                    </div>
                  </td>
                  <td style={{ padding: '8px 8px' }}>
                    <StatusPill status={o.status} />
                  </td>
                  <td
                    style={{
                      padding: '8px 8px',
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
                  <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                    <a
                      href={`/admin/collections/orders/${o.id}`}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--theme-text)',
                        textDecoration: 'none',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'var(--theme-elevation-100)',
                        border: '1px solid var(--theme-elevation-200)',
                      }}
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
