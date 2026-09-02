'use client'

import React from 'react'
import type { OrderStatusBreakdown } from '../../../lib/admin-dashboard-stats'

type FulfillmentPipelineProps = {
  breakdown: OrderStatusBreakdown
  totalOrders: number
}

export function FulfillmentPipeline({ breakdown, totalOrders }: FulfillmentPipelineProps) {
  const stages = [
    { key: 'pending', label: 'Pending', count: breakdown.pending, dotColor: 'var(--theme-warning-500, #d97706)' },
    { key: 'processing', label: 'Processing', count: breakdown.processing, dotColor: 'var(--theme-elevation-600, #555)' },
    { key: 'shipped', label: 'Shipped', count: breakdown.shipped, dotColor: 'var(--theme-elevation-700, #333)' },
    { key: 'delivered', label: 'Delivered', count: breakdown.delivered + breakdown.completed, dotColor: 'var(--theme-success-500, #16a34a)' },
    { key: 'cancelled', label: 'Cancelled', count: breakdown.cancelled, dotColor: 'var(--theme-elevation-400, #888)' },
    { key: 'refunded', label: 'Refunded', count: breakdown.refunded, dotColor: 'var(--theme-error-500, #dc2626)' },
  ]

  return (
    <div
      style={{
        borderRadius: 8,
        border: '1px solid var(--theme-elevation-200)',
        background: 'var(--theme-elevation-50)',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--theme-elevation-600, #555)' }}>
          Order Fulfillment Status ({totalOrders} total in range)
        </div>
        <a
          href="/admin/collections/orders"
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-text)', textDecoration: 'none' }}
        >
          View Orders &rarr;
        </a>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: '0.5rem',
        }}
      >
        {stages.map((st) => (
          <div
            key={st.key}
            style={{
              padding: '0.55rem 0.75rem',
              borderRadius: 6,
              background: 'var(--theme-elevation-100)',
              border: '1px solid var(--theme-elevation-150, rgba(120,120,120,0.1))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dotColor }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--theme-elevation-500)' }}>
                {st.label}
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--theme-text)' }}>
              {st.count}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
