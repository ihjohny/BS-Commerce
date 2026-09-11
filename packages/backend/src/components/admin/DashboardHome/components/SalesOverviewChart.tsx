'use client'

import React, { useState } from 'react'
import type { SalesChartPoint } from '../../../../lib/admin-dashboard-stats'

type SalesOverviewChartProps = {
  data: SalesChartPoint[]
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

/**
 * Builds a smooth SVG cubic bezier path through points (Catmull-Rom style control points)
 */
function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`
  if (points.length === 2) return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`

  let path = `M ${points[0].x},${points[0].y}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2

    // Catmull-Rom to Cubic Bezier control points
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    path += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`
  }

  return path
}

export function SalesOverviewChart({ data, currency }: SalesOverviewChartProps) {
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue')
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const isRevenue = metric === 'revenue'
  const values = data.map((d) => (isRevenue ? d.revenue : d.orders))
  const maxValue = Math.max(...values, isRevenue ? 100 : 5)
  const totalValue = values.reduce((acc, v) => acc + v, 0)
  const averageValue = values.length > 0 ? totalValue / values.length : 0

  // Chart dimensions
  const width = 720
  const height = 250
  const paddingLeft = 52
  const paddingRight = 24
  const paddingTop = 24
  const paddingBottom = 34
  const chartWidth = width - paddingLeft - paddingRight
  const chartHeight = height - paddingTop - paddingBottom

  const points = data.map((d, i) => {
    const x = paddingLeft + (data.length > 1 ? (i / (data.length - 1)) * chartWidth : chartWidth / 2)
    const val = isRevenue ? d.revenue : d.orders
    const y = height - paddingBottom - (val / maxValue) * chartHeight
    return { x, y, val, data: d }
  })

  const smoothPathD = buildSmoothPath(points)
  const smoothAreaD =
    points.length > 0
      ? `${smoothPathD} L ${points[points.length - 1].x},${height - paddingBottom} L ${points[0].x},${height - paddingBottom} Z`
      : ''

  const sym = currency === 'BDT' ? '৳' : currency === 'USD' ? '$' : `${currency} `

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => {
    const val = maxValue * pct
    const y = height - paddingBottom - pct * chartHeight
    const label = isRevenue
      ? val >= 1000
        ? `${sym}${(val / 1000).toFixed(1)}k`
        : `${sym}${Math.round(val)}`
      : Math.round(val).toString()
    return { y, label }
  })

  // Choose sensible tick intervals for X axis (max ~6 labels)
  const step = Math.max(1, Math.ceil(data.length / 6))
  const xLabels = points.filter((_, idx) => idx % step === 0 || idx === points.length - 1)

  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null

  return (
    <div
      style={{
        borderRadius: 'var(--bs-radius-lg, 12px)',
        border: '1px solid var(--theme-elevation-150, #e2e8f0)',
        background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxShadow: 'var(--bs-shadow-xs, 0 1px 2px 0 rgba(0, 0, 0, 0.03))',
      }}
    >
      {/* Chart Top Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: '1rem',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 'var(--bs-font-md, 0.9375rem)',
              fontWeight: 600,
              color: 'var(--theme-text, #0f172a)',
              letterSpacing: '-0.015em',
            }}
          >
            Sales Overview
          </div>
          <div
            style={{
              fontSize: 'var(--bs-font-xs, 0.75rem)',
              color: 'var(--theme-elevation-500, #64748b)',
              marginTop: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span>Daily performance for the selected timeframe</span>
            <span style={{ color: 'var(--theme-elevation-300, #cbd5e1)' }}>•</span>
            <span>
              Daily Avg:{' '}
              <strong style={{ color: 'var(--theme-text, #0f172a)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {isRevenue ? formatCurrency(averageValue, currency) : `${averageValue.toFixed(1)} orders`}
              </strong>
            </span>
          </div>
        </div>

        {/* Metric Segmented Switcher */}
        <div
          style={{
            display: 'inline-flex',
            padding: 2,
            borderRadius: 'var(--bs-radius-sm, 7px)',
            background: 'var(--theme-elevation-100, #f1f5f9)',
            border: '1px solid var(--theme-elevation-150, #e2e8f0)',
            gap: 2,
          }}
        >
          <button
            type="button"
            onClick={() => setMetric('revenue')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--bs-radius-xs, 5px)',
              fontSize: 'var(--bs-font-sm, 0.8125rem)',
              fontWeight: isRevenue ? 600 : 500,
              border: 'none',
              cursor: 'pointer',
              background: isRevenue ? 'var(--theme-elevation-0, #ffffff)' : 'transparent',
              color: isRevenue ? 'var(--theme-text, #0f172a)' : 'var(--theme-elevation-600, #64748b)',
              boxShadow: isRevenue ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Revenue
          </button>
          <button
            type="button"
            onClick={() => setMetric('orders')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--bs-radius-xs, 5px)',
              fontSize: 'var(--bs-font-sm, 0.8125rem)',
              fontWeight: !isRevenue ? 600 : 500,
              border: 'none',
              cursor: 'pointer',
              background: !isRevenue ? 'var(--theme-elevation-0, #ffffff)' : 'transparent',
              color: !isRevenue ? 'var(--theme-text, #0f172a)' : 'var(--theme-elevation-600, #64748b)',
              boxShadow: !isRevenue ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Orders
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div
          style={{
            flex: 1,
            minHeight: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--theme-elevation-400, #94a3b8)',
            fontSize: '0.8125rem',
            gap: 6,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span>No sales or order events recorded in this time range.</span>
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', flex: 1 }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="salesOverviewAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--bs-primary, #2563eb)" stopOpacity="0.18" />
                <stop offset="85%" stopColor="var(--bs-primary, #2563eb)" stopOpacity="0.02" />
                <stop offset="100%" stopColor="var(--bs-primary, #2563eb)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {yTicks.map((tick, idx) => (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={tick.y}
                  x2={width - paddingRight}
                  y2={tick.y}
                  stroke="var(--theme-elevation-150, #e2e8f0)"
                  strokeDasharray={idx === 0 ? undefined : '3 3'}
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 10}
                  y={tick.y + 3.5}
                  textAnchor="end"
                  fontSize="10.5"
                  fontWeight="500"
                  fill="var(--theme-elevation-450, #64748b)"
                >
                  {tick.label}
                </text>
              </g>
            ))}

            {/* Subtle Gradient Area Fill */}
            {smoothAreaD && (
              <path d={smoothAreaD} fill="url(#salesOverviewAreaGradient)" />
            )}

            {/* Smooth Bezier Line */}
            {smoothPathD && (
              <path
                d={smoothPathD}
                fill="none"
                stroke="var(--bs-primary, #2563eb)"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Crosshair guide line for active hover */}
            {hoveredPoint && (
              <g>
                <line
                  x1={hoveredPoint.x}
                  y1={paddingTop}
                  x2={hoveredPoint.x}
                  y2={height - paddingBottom}
                  stroke="var(--bs-primary, #2563eb)"
                  strokeWidth="1.25"
                  strokeDasharray="3 3"
                  opacity="0.6"
                />
              </g>
            )}

            {/* Data Point Dots & Invisible Hover hit targets */}
            {points.map((p, idx) => {
              const isHovered = hoverIndex === idx
              return (
                <g
                  key={idx}
                  onMouseEnter={() => setHoverIndex(idx)}
                  onMouseLeave={() => setHoverIndex(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Outer glow ring on hover */}
                  {isHovered && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="7.5"
                      fill="var(--bs-primary-subtle, rgba(37, 99, 235, 0.15))"
                    />
                  )}
                  {/* Central node */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 4.5 : 2.5}
                    fill="var(--bs-primary, #2563eb)"
                    stroke="var(--theme-elevation-0, var(--theme-bg, #ffffff))"
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    style={{ transition: 'r 0.12s ease' }}
                  />
                  {/* Generous invisible touch/hover hit-box */}
                  <rect
                    x={p.x - 14}
                    y={paddingTop}
                    width="28"
                    height={height - paddingTop - paddingBottom}
                    fill="transparent"
                  />
                </g>
              )
            })}

            {/* X-Axis Labels */}
            {xLabels.map((p, idx) => (
              <text
                key={idx}
                x={p.x}
                y={height - 12}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight="500"
                fill="var(--theme-elevation-500, #64748b)"
              >
                {p.data.date}
              </text>
            ))}
          </svg>

          {/* Precision Floating Tooltip */}
          {hoveredPoint && (
            <div
              className="admin-chart-tooltip"
              style={{
                top: 8,
                left: `${Math.min(84, Math.max(16, (hoveredPoint.x / width) * 100))}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="admin-chart-tooltip__title">
                {hoveredPoint.data.date}
              </div>
              <div className="admin-chart-tooltip__row">
                <span className="admin-chart-tooltip__label">Revenue:</span>
                <strong className="admin-chart-tooltip__val">
                  {formatCurrency(hoveredPoint.data.revenue, currency)}
                </strong>
              </div>
              <div className="admin-chart-tooltip__row">
                <span className="admin-chart-tooltip__label">Orders:</span>
                <strong className="admin-chart-tooltip__val">
                  {hoveredPoint.data.orders.toLocaleString()}
                </strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

