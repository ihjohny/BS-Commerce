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
      label: 'Pending Approval',
      sublabel: 'Awaiting fulfillment',
      count: breakdown.pending,
      dotColor: '#d97706',
      bgLight: 'rgba(217, 119, 6, 0.1)',
      borderColor: 'rgba(217, 119, 6, 0.25)',
      badge: breakdown.pending > 0 ? 'Needs Action' : null,
      href: '/admin/collections/orders?where%5Bstatus%5D%5Bequals%5D=pending',
    },
    {
      key: 'processing',
      label: 'Processing / Packing',
      sublabel: 'Being prepared',
      count: breakdown.processing,
      dotColor: '#2563eb',
      bgLight: 'rgba(37, 99, 235, 0.1)',
      borderColor: 'rgba(37, 99, 235, 0.25)',
      badge: null,
      href: '/admin/collections/orders?where%5Bstatus%5D%5Bequals%5D=processing',
    },
    {
      key: 'shipped',
      label: 'Shipped / In Transit',
      sublabel: 'With courier partner',
      count: breakdown.shipped,
      dotColor: '#7c3aed',
      bgLight: 'rgba(124, 58, 237, 0.1)',
      borderColor: 'rgba(124, 58, 237, 0.25)',
      badge: null,
      href: '/admin/collections/orders?where%5Bstatus%5D%5Bequals%5D=shipped',
    },
    {
      key: 'delivered',
      label: 'Delivered & Done',
      sublabel: 'Customer received',
      count: breakdown.delivered + breakdown.completed,
      dotColor: '#16a34a',
      bgLight: 'rgba(22, 163, 74, 0.1)',
      borderColor: 'rgba(22, 163, 74, 0.25)',
      badge: null,
      href: '/admin/collections/orders?where%5Bstatus%5D%5Bin%5D%5B0%5D=delivered&where%5Bstatus%5D%5Bin%5D%5B1%5D=completed',
    },
    {
      key: 'cancelled',
      label: 'Cancelled',
      sublabel: 'Voided by client/store',
      count: breakdown.cancelled,
      dotColor: '#64748b',
      bgLight: 'rgba(100, 116, 139, 0.1)',
      borderColor: 'rgba(100, 116, 139, 0.2)',
      badge: null,
      href: '/admin/collections/orders?where%5Bstatus%5D%5Bequals%5D=cancelled',
    },
    {
      key: 'refunded',
      label: 'Returns & Refunds',
      sublabel: 'Returned goods',
      count: breakdown.refunded,
      dotColor: '#dc2626',
      bgLight: 'rgba(220, 38, 38, 0.1)',
      borderColor: 'rgba(220, 38, 38, 0.2)',
      badge: null,
      href: '/admin/collections/orders?where%5Bstatus%5D%5Bequals%5D=refunded',
    },
  ]

  const totalStageCount = stages.reduce((acc, s) => acc + s.count, 0)

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid var(--theme-elevation-150, #e2e8f0)',
        background: 'var(--theme-elevation-0, #ffffff)',
        padding: '1.25rem 1.4rem',
        marginBottom: '1.25rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.9rem',
        }}
      >
        <div>
          <span style={{ fontSize: 'var(--bs-font-md, 0.9375rem)', fontWeight: 700, color: 'var(--theme-elevation-900, #0f172a)' }}>
            Fulfillment Workflow Pipeline
          </span>
          <span style={{ fontSize: 'var(--bs-font-sm, 0.8125rem)', color: 'var(--theme-elevation-500, #64748b)', marginLeft: 8 }}>
            ({totalOrders} total orders in period)
          </span>
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
          <span>All Orders</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {/* Multi-Segment Proportion Track */}
      {totalStageCount > 0 && (
        <div
          style={{
            display: 'flex',
            height: 6,
            borderRadius: 9999,
            overflow: 'hidden',
            background: 'var(--theme-elevation-150, #e2e8f0)',
            marginBottom: '1.1rem',
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

      {/* Stage Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
        }}
      >
        {stages.map((st) => {
          const percentage = totalStageCount > 0 ? ((st.count / totalStageCount) * 100).toFixed(0) : '0'

          return (
            <Link
              key={st.key}
              href={st.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                textDecoration: 'none',
                padding: '0.75rem 0.9rem',
                borderRadius: 9,
                background: 'var(--theme-elevation-50, #f8fafc)',
                border: `1px solid ${st.badge ? st.borderColor : 'var(--theme-elevation-150, #e2e8f0)'}`,
                transition: 'all 0.15s ease',
                minHeight: 78,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--bs-primary, #2563eb)'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.04)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = st.badge ? st.borderColor : 'var(--theme-elevation-150, #e2e8f0)'
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: st.dotColor,
                      boxShadow: `0 0 0 2px ${st.bgLight}`,
                    }}
                  />
                  <span style={{ fontSize: 'var(--bs-font-sm, 0.8125rem)', fontWeight: 600, color: 'var(--theme-elevation-700, #334155)' }}>
                    {st.label}
                  </span>
                </div>
                {st.badge && (
                  <span
                    style={{
                      fontSize: 'var(--bs-font-2xs, 0.6875rem)',
                      fontWeight: 700,
                      padding: '1.5px 6px',
                      borderRadius: 4,
                      background: st.bgLight,
                      color: st.dotColor,
                    }}
                  >
                    {st.badge}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
                <div
                  style={{
                    fontSize: 'var(--bs-font-xl, 1.35rem)',
                    fontWeight: 700,
                    color: 'var(--theme-elevation-900, #0f172a)',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.1,
                  }}
                >
                  {st.count.toLocaleString()}
                </div>
                <div style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', color: 'var(--theme-elevation-400, #94a3b8)', fontWeight: 500 }}>
                  {percentage}%
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
