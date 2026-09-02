'use client'

import React, { useState } from 'react'
import type { SalesChartPoint } from '../../../lib/admin-dashboard-stats'

type SalesOverviewChartProps = {
  data: SalesChartPoint[]
  currency: string
}

function formatCurrency(amount: number, currency: string) {
  const symbol = currency === 'BDT' ? '৳' : currency === 'USD' ? '$' : `${currency} `
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function SalesOverviewChart({ data, currency }: SalesOverviewChartProps) {
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue')
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const isRevenue = metric === 'revenue'
  const values = data.map((d) => (isRevenue ? d.revenue : d.orders))
  const maxValue = Math.max(...values, isRevenue ? 100 : 5)
  const totalValue = values.reduce((acc, v) => acc + v, 0)

  // Chart dimensions
  const width = 680
  const height = 230
  const paddingX = 42
  const paddingY = 28
  const chartWidth = width - paddingX * 2
  const chartHeight = height - paddingY * 2

  const points = data.map((d, i) => {
    const x = paddingX + (data.length > 1 ? (i / (data.length - 1)) * chartWidth : chartWidth / 2)
    const val = isRevenue ? d.revenue : d.orders
    const y = height - paddingY - (val / maxValue) * chartHeight
    return { x, y, val, data: d }
  })

  const pathD =
    points.length > 0
      ? `M ${points[0].x} ${points[0].y} ` +
        points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')
      : ''

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
      : ''

  const yTicks = [0, 0.5, 1].map((pct) => {
    const val = maxValue * pct
    const y = height - paddingY - pct * chartHeight
    const label = isRevenue
      ? val >= 1000
        ? `$${(val / 1000).toFixed(1)}k`
        : `$${Math.round(val)}`
      : Math.round(val).toString()
    return { y, label }
  })

  const step = Math.max(1, Math.floor(data.length / 6))
  const xLabels = points.filter((_, idx) => idx % step === 0 || idx === points.length - 1)

  return (
    <div
      style={{
        borderRadius: 8,
        border: '1px solid var(--theme-elevation-200)',
        background: 'var(--theme-elevation-50)',
        padding: '1.25rem 1.4rem',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
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
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--theme-text)' }}>
            Sales Activity
          </div>
          <div style={{ fontSize: 12, color: 'var(--theme-elevation-500)', marginTop: 2 }}>
            Total {isRevenue ? 'Revenue' : 'Orders'}:{' '}
            <strong style={{ color: 'var(--theme-text)' }}>
              {isRevenue ? formatCurrency(totalValue, currency) : `${totalValue.toLocaleString()} orders`}
            </strong>
          </div>
        </div>

        {/* Toggle Pill */}
        <div
          style={{
            display: 'inline-flex',
            padding: 2,
            borderRadius: 6,
            background: 'var(--theme-elevation-150, rgba(120,120,120,0.15))',
          }}
        >
          <button
            onClick={() => setMetric('revenue')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: isRevenue ? 'var(--theme-elevation-0, #fff)' : 'transparent',
              color: isRevenue ? 'var(--theme-text)' : 'var(--theme-elevation-500)',
              boxShadow: isRevenue ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            Revenue
          </button>
          <button
            onClick={() => setMetric('orders')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: !isRevenue ? 'var(--theme-elevation-0, #fff)' : 'transparent',
              color: !isRevenue ? 'var(--theme-text)' : 'var(--theme-elevation-500)',
              boxShadow: !isRevenue ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
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
            minHeight: 180,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--theme-elevation-400)',
            fontSize: 13,
          }}
        >
          No activity recorded in this period.
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', flex: 1 }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
            <defs>
              <linearGradient id="chartGradientNeutral" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--theme-text)" stopOpacity="0.12" />
                <stop offset="100%" stopColor="var(--theme-text)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid */}
            {yTicks.map((tick, idx) => (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={tick.y}
                  x2={width - paddingX}
                  y2={tick.y}
                  stroke="var(--theme-elevation-200, rgba(120,120,120,0.15))"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={tick.y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--theme-elevation-400, #888)"
                >
                  {tick.label}
                </text>
              </g>
            ))}

            {/* Area */}
            {areaD && <path d={areaD} fill="url(#chartGradientNeutral)" />}

            {/* Line */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="var(--theme-text)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Points */}
            {points.map((p, idx) => (
              <g key={idx} onMouseEnter={() => setHoverIndex(idx)} onMouseLeave={() => setHoverIndex(null)}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hoverIndex === idx ? 5 : 2.5}
                  fill="var(--theme-text)"
                  stroke="var(--theme-elevation-50, #fff)"
                  strokeWidth="2"
                  style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                />
                <circle cx={p.x} cy={p.y} r="12" fill="transparent" style={{ cursor: 'pointer' }} />
              </g>
            ))}

            {/* X Labels */}
            {xLabels.map((p, idx) => (
              <text
                key={idx}
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                fontSize="10"
                fill="var(--theme-elevation-500, #888)"
              >
                {p.data.date}
              </text>
            ))}
          </svg>

          {/* Tooltip */}
          {hoverIndex !== null && points[hoverIndex] && (
            <div
              style={{
                position: 'absolute',
                top: 6,
                left: `${Math.min(85, Math.max(15, (points[hoverIndex].x / width) * 100))}%`,
                transform: 'translateX(-50%)',
                background: 'var(--theme-elevation-900, #1e293b)',
                color: '#fff',
                padding: '5px 10px',
                borderRadius: 6,
                fontSize: 12,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                pointerEvents: 'none',
                zIndex: 10,
                whiteSpace: 'nowrap',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{points[hoverIndex].data.date}</div>
              <div>Revenue: {formatCurrency(points[hoverIndex].data.revenue, currency)}</div>
              <div>Orders: {points[hoverIndex].data.orders}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
