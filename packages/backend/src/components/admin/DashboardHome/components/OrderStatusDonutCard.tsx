'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import type { OrderStatusBreakdown } from '../../../../lib/admin-dashboard-stats'

type OrderStatusDonutCardProps = {
  breakdown: OrderStatusBreakdown
  totalOrders: number
}

type StatusSegment = {
  key: string
  label: string
  count: number
  color: string
  href: string
}

export function OrderStatusDonutCard({ breakdown, totalOrders }: OrderStatusDonutCardProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  // Standardize stages matching Apex shadcn order status breakdown
  const segments: StatusSegment[] = [
    {
      key: 'completed',
      label: 'Delivered / Done',
      count: (breakdown.delivered || 0) + (breakdown.completed || 0),
      color: '#16a34a', // Emerald green
      href: '/admin/collections/orders?where%5Bstatus%5D%5Bin%5D%5B0%5D=delivered&where%5Bstatus%5D%5Bin%5D%5B1%5D=completed',
    },
    {
      key: 'processing',
      label: 'Processing / Packing',
      count: breakdown.processing || 0,
      color: 'var(--bs-primary, #2563eb)', // Blue
      href: '/admin/collections/orders?where%5Bstatus%5D%5Bequals%5D=processing',
    },
    {
      key: 'pending',
      label: 'Pending / Approval',
      count: breakdown.pending || 0,
      color: '#d97706', // Amber
      href: '/admin/collections/orders?where%5Bstatus%5D%5Bequals%5D=pending',
    },
    {
      key: 'shipped',
      label: 'In Transit / Shipped',
      count: breakdown.shipped || 0,
      color: '#7c3aed', // Violet
      href: '/admin/collections/orders?where%5Bstatus%5D%5Bequals%5D=shipped',
    },
    {
      key: 'cancelled',
      label: 'Cancelled / Refunded',
      count: (breakdown.cancelled || 0) + (breakdown.refunded || 0),
      color: '#dc2626', // Red
      href: '/admin/collections/orders?where%5Bstatus%5D%5Bin%5D%5B0%5D=cancelled&where%5Bstatus%5D%5Bin%5D%5B1%5D=refunded',
    },
  ]

  const total = segments.reduce((sum, s) => sum + s.count, 0) || totalOrders || 1

  // SVG circular donut math
  const size = 164
  const strokeWidth = 18
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let accumulatedAngle = 0

  return (
    <div
      style={{
        borderRadius: 'var(--bs-radius-lg, 12px)',
        border: '1px solid var(--theme-elevation-150, #e2e8f0)',
        background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        boxShadow: 'var(--bs-shadow-xs, 0 1px 2px 0 rgba(0, 0, 0, 0.03))',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <div
          style={{
            fontSize: 'var(--bs-font-md, 0.9375rem)',
            fontWeight: 600,
            color: 'var(--theme-text, #0f172a)',
            letterSpacing: '-0.015em',
          }}
        >
          Order Status
        </div>
        <div style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', color: 'var(--theme-elevation-500, #64748b)', marginTop: 2 }}>
          Distribution across active orders
        </div>
      </div>

      {/* Circular Gauge Centerpiece */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0.5rem 0 1.25rem 0' }}>
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
            {/* Background track circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="var(--theme-elevation-100, #f1f5f9)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {/* Render Donut Segments */}
            {segments.map((seg) => {
              const fraction = seg.count / total
              const strokeDasharray = `${fraction * circumference} ${circumference}`
              const strokeDashoffset = -accumulatedAngle * circumference
              accumulatedAngle += fraction
              const isHovered = hoveredKey === seg.key

              if (seg.count === 0) return null

              return (
                <circle
                  key={seg.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={seg.color}
                  strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    cursor: 'pointer',
                    opacity: hoveredKey && !isHovered ? 0.45 : 1,
                  }}
                  onMouseEnter={() => setHoveredKey(seg.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
              )
            })}
          </svg>

          {/* Centered Total / Active Label */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            {hoveredKey ? (
              <>
                <span
                  style={{
                    fontSize: 'var(--bs-font-xl, 1.35rem)',
                    fontWeight: 700,
                    lineHeight: 1.1,
                    fontVariantNumeric: 'tabular-nums',
                    color: segments.find((s) => s.key === hoveredKey)?.color || 'var(--theme-text, #0f172a)',
                  }}
                >
                  {segments.find((s) => s.key === hoveredKey)?.count || 0}
                </span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--theme-elevation-500, #64748b)', marginTop: 2 }}>
                  {segments.find((s) => s.key === hoveredKey)?.label.split('/')[0]}
                </span>
              </>
            ) : (
              <>
                <span
                  style={{
                    fontSize: 'var(--bs-font-2xl, 1.5rem)',
                    fontWeight: 700,
                    lineHeight: 1.1,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--theme-text, #0f172a)',
                  }}
                >
                  {totalOrders.toLocaleString()}
                </span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--theme-elevation-500, #64748b)', marginTop: 2 }}>
                  Orders
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Segment Legend Rows matching Apex Shadcn */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%' }}>
        {segments.map((seg) => {
          const pct = total > 0 ? ((seg.count / total) * 100).toFixed(0) : '0'
          const isHovered = hoveredKey === seg.key

          return (
            <Link
              key={seg.key}
              href={seg.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textDecoration: 'none',
                padding: '4px 6px',
                borderRadius: 'var(--bs-radius-sm, 6px)',
                background: isHovered ? 'var(--theme-elevation-100, #f1f5f9)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={() => setHoveredKey(seg.key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    backgroundColor: seg.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 'var(--bs-font-xs, 0.75rem)',
                    color: isHovered ? 'var(--theme-text, #0f172a)' : 'var(--theme-elevation-600, #64748b)',
                    fontWeight: isHovered ? 600 : 500,
                  }}
                >
                  {seg.label}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontSize: 'var(--bs-font-xs, 0.75rem)',
                    fontWeight: 700,
                    color: 'var(--theme-text, #0f172a)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {seg.count.toLocaleString()}
                </span>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--theme-elevation-400, #94a3b8)',
                    width: 30,
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {pct}%
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
