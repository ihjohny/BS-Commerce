'use client'

import React from 'react'
import Link from 'next/link'
import type { OrderStatusBreakdown } from '../../../../lib/admin-dashboard-stats'

type FulfillmentPipelineProps = {
  breakdown: OrderStatusBreakdown
  totalOrders: number
}

export function FulfillmentPipeline({ breakdown, totalOrders }: FulfillmentPipelineProps) {
  const stages = [
    {
      key: 'pending',
      label: 'Pending',
      count: breakdown.pending,
      dotColor: '#f59e0b',
      bgLight: 'rgba(245, 158, 11, 0.12)',
      href: '/admin/collections/orders?where%5Bstatus%5D%5Bequals%5D=pending',
    },
    {
      key: 'processing',
      label: 'Processing',
      count: breakdown.processing,
      dotColor: '#3b82f6',
      bgLight: 'rgba(59, 130, 246, 0.12)',
      href: '/admin/collections/orders?where%5Bstatus%5D%5Bequals%5D=processing',
    },
    {
      key: 'shipped',
      label: 'Shipped',
      count: breakdown.shipped,
      dotColor: '#6366f1',
      bgLight: 'rgba(99, 102, 241, 0.12)',
      href: '/admin/collections/orders?where%5Bstatus%5D%5Bequals%5D=shipped',
    },
    {
      key: 'delivered',
      label: 'Delivered',
      count: breakdown.delivered + breakdown.completed,
      dotColor: '#10b981',
      bgLight: 'rgba(16, 185, 129, 0.12)',
      href: '/admin/collections/orders?where%5Bstatus%5D%5Bin%5D%5B0%5D=delivered&where%5Bstatus%5D%5Bin%5D%5B1%5D=completed',
    },
    {
      key: 'cancelled',
      label: 'Cancelled',
      count: breakdown.cancelled,
      dotColor: '#94a3b8',
      bgLight: 'rgba(148, 163, 184, 0.12)',
      href: '/admin/collections/orders?where%5Bstatus%5D%5Bequals%5D=cancelled',
    },
    {
      key: 'refunded',
      label: 'Refunded',
      count: breakdown.refunded,
      dotColor: '#ef4444',
      bgLight: 'rgba(239, 68, 68, 0.12)',
      href: '/admin/collections/orders?where%5Bstatus%5D%5Bequals%5D=refunded',
    },
  ]

  const totalStageCount = stages.reduce((acc, s) => acc + s.count, 0)

  return (
    <div
      style={{
        borderRadius: 'var(--bs-radius-md, 8px)',
        border: '1px solid var(--theme-elevation-150)',
        background: 'var(--theme-elevation-50)',
        padding: '1.25rem 1.4rem',
        marginBottom: '1.75rem',
        boxShadow: 'var(--bs-shadow-xs)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.85rem',
        }}
      >
        <div>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--theme-text)' }}>
            Order Fulfillment Pipeline
          </span>
          <span style={{ fontSize: 12, color: 'var(--theme-elevation-500)', marginLeft: 8 }}>
            ({totalOrders} total in range)
          </span>
        </div>
        <Link
          href="/admin/collections/orders"
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--bs-primary, #2563eb)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          Manage Orders &rarr;
        </Link>
      </div>

      {/* Visual Multi-Segment Proportion Bar */}
      {totalStageCount > 0 && (
        <div
          style={{
            display: 'flex',
            height: 6,
            borderRadius: 'var(--bs-radius-full, 9999px)',
            overflow: 'hidden',
            background: 'var(--theme-elevation-150)',
            marginBottom: '1rem',
            gap: 2,
          }}
        >
          {stages.map((st) => {
            const pct = (st.count / totalStageCount) * 100
            if (pct <= 0) return null
            return (
              <div
                key={st.key}
                style={{
                  width: `${pct}%`,
                  background: st.dotColor,
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }}
                title={`${st.label}: ${st.count} (${pct.toFixed(1)}%)`}
              />
            )
          })}
        </div>
      )}

      {/* Stage Action Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.65rem',
        }}
      >
        {stages.map((st) => (
          <a
            key={st.key}
            href={st.href}
            title={`View ${st.label} orders`}
            style={{
              display: 'block',
              textDecoration: 'none',
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--bs-radius-sm, 6px)',
              background: 'var(--theme-elevation-0, var(--theme-bg))',
              border: '1px solid var(--theme-elevation-150)',
              transition: 'all 0.15s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--bs-primary-border)'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = 'var(--bs-shadow-sm)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--theme-elevation-150)'
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: st.dotColor,
                  boxShadow: `0 0 0 2px ${st.bgLight}`,
                }}
              />
              <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--theme-elevation-500)' }}>
                {st.label}
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--theme-text)', lineHeight: 1.2, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {st.count}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
