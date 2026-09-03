'use client'

import React, { useState } from 'react'
import type { ReportChart as ReportChartType } from '../../../../lib/admin-reports'

type ReportChartProps = {
  chart: ReportChartType
  currency: string
}

export function ReportChart({ chart, currency }: ReportChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [activeSeriesKey, setActiveSeriesKey] = useState<string | 'all'>('all')

  const { data, series, type, xAxisKey } = chart

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          background: 'var(--theme-elevation-50)',
          border: '1px solid var(--theme-elevation-200)',
          borderRadius: 8,
          padding: '2.5rem',
          textAlign: 'center',
          color: 'var(--theme-elevation-500)',
          fontSize: 13,
          marginBottom: '1.5rem',
        }}
      >
        No chart activity recorded for the selected period and filters.
      </div>
    )
  }

  // Determine primary series to plot or evaluate max values
  const visibleSeries = activeSeriesKey === 'all' ? series : series.filter((s) => s.key === activeSeriesKey)

  const maxVal = Math.max(
    ...data.map((d) => {
      let m = 0
      for (const s of visibleSeries) {
        const v = Number(d[s.key]) || 0
        if (v > m) m = v
      }
      return m
    }),
    10
  )

  const width = 800
  const height = 240
  const padLeft = 55
  const padRight = 30
  const padTop = 25
  const padBottom = 35
  const chartW = width - padLeft - padRight
  const chartH = height - padTop - padBottom

  // Y-axis ticks
  const yTicks = [0, 0.5, 1].map((pct) => {
    const val = maxVal * pct
    const y = height - padBottom - pct * chartH
    const label =
      val >= 1000000
        ? `${(val / 1000000).toFixed(1)}M`
        : val >= 1000
        ? `${(val / 1000).toFixed(1)}k`
        : Math.round(val).toString()
    return { y, label }
  })

  // Bar width calculation
  const barSlotW = chartW / data.length
  const barW = Math.max(6, Math.min(32, barSlotW * 0.6))

  // Render Bar chart or Line chart
  const isLine = type === 'line'

  return (
    <div
      style={{
        background: 'var(--theme-elevation-50)',
        border: '1px solid var(--theme-elevation-200)',
        borderRadius: 8,
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header & Legend */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Trend Visualization
        </div>

        {/* Series toggle buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {series.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActiveSeriesKey(activeSeriesKey === s.key ? 'all' : s.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 8px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid',
                borderColor: activeSeriesKey === 'all' || activeSeriesKey === s.key ? 'var(--theme-elevation-400)' : 'var(--theme-elevation-200)',
                background:
                  activeSeriesKey === 'all' || activeSeriesKey === s.key
                    ? 'var(--theme-elevation-150)'
                    : 'var(--theme-elevation-0, #fff)',
                color: activeSeriesKey === 'all' || activeSeriesKey === s.key ? 'var(--theme-text)' : 'var(--theme-elevation-500)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: s.color,
                }}
              />
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart */}
      <div style={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', maxHeight: 260, minWidth: 500, display: 'block' }}
        >
          {/* Y Grid lines */}
          {yTicks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={t.y}
                x2={width - padRight}
                y2={t.y}
                stroke="var(--theme-elevation-200)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={t.y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--theme-elevation-500)"
                fontFamily="inherit"
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* Bar rendering */}
          {!isLine &&
            data.map((d, i) => {
              const xCenter = padLeft + i * barSlotW + barSlotW / 2
              return (
                <g key={i} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
                  {/* Invisible hit box for hover */}
                  <rect
                    x={padLeft + i * barSlotW}
                    y={padTop}
                    width={barSlotW}
                    height={chartH}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                  />

                  {visibleSeries.map((s, sIdx) => {
                    const val = Number(d[s.key]) || 0
                    const barH = (val / maxVal) * chartH
                    const barX =
                      xCenter -
                      (visibleSeries.length * (barW / visibleSeries.length)) / 2 +
                      sIdx * (barW / visibleSeries.length)
                    const barY = height - padBottom - barH

                    return (
                      <rect
                        key={s.key}
                        x={barX}
                        y={barY}
                        width={barW / visibleSeries.length - (visibleSeries.length > 1 ? 1 : 0)}
                        height={Math.max(2, barH)}
                        rx="2"
                        fill={s.color}
                        opacity={hoverIndex === null || hoverIndex === i ? 0.9 : 0.4}
                        style={{ transition: 'opacity 0.15s ease' }}
                      />
                    )
                  })}

                  {/* X Axis Label */}
                  {(() => {
                    const barStep = data.length > 14 ? Math.ceil(data.length / 7) : data.length > 8 ? 2 : 1
                    if (i % barStep !== 0 && i !== data.length - 1) return null
                    const rawLabel = String(d[xAxisKey] || '')
                    const displayLabel = rawLabel.length > 12 ? `${rawLabel.slice(0, 10)}…` : rawLabel

                    return (
                      <text
                        x={xCenter}
                        y={height - padBottom + 16}
                        textAnchor="middle"
                        fontSize="11"
                        fill="var(--theme-elevation-600)"
                        fontFamily="inherit"
                      >
                        {displayLabel}
                      </text>
                    )
                  })()}
                </g>
              )
            })}

          {/* Line rendering */}
          {isLine && (
            <>
              {visibleSeries.map((s) => {
                const points = data.map((d, i) => {
                  const x = padLeft + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2)
                  const val = Number(d[s.key]) || 0
                  const y = height - padBottom - (val / maxVal) * chartH
                  return { x, y, val, item: d }
                })

                const lineD =
                  points.length > 0
                    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')
                    : ''

                const areaD =
                  points.length > 0
                    ? `${lineD} L ${points[points.length - 1].x} ${height - padBottom} L ${points[0].x} ${
                        height - padBottom
                      } Z`
                    : ''

                return (
                  <g key={s.key}>
                    <path d={areaD} fill={s.color} opacity="0.1" />
                    <path
                      d={lineD}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {points.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={hoverIndex === i ? 5 : 3}
                        fill={s.color}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        onMouseEnter={() => setHoverIndex(i)}
                        onMouseLeave={() => setHoverIndex(null)}
                        style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                      />
                    ))}
                  </g>
                )
              })}

              {/* X Axis Labels for Line */}
              {data.map((d, i) => {
                const step = Math.max(1, Math.floor(data.length / 8))
                if (i % step !== 0 && i !== data.length - 1) return null
                const x = padLeft + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2)
                const rawLabel = String(d[xAxisKey] || '')
                const displayLabel = rawLabel.length > 12 ? `${rawLabel.slice(0, 10)}…` : rawLabel

                return (
                  <text
                    key={i}
                    x={x}
                    y={height - padBottom + 16}
                    textAnchor="middle"
                    fontSize="11"
                    fill="var(--theme-elevation-600)"
                    fontFamily="inherit"
                  >
                    {displayLabel}
                  </text>
                )
              })}
            </>
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoverIndex !== null && data[hoverIndex] && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 15,
              background: 'var(--theme-elevation-800, #1e293b)',
              color: '#ffffff',
              padding: '0.5rem 0.75rem',
              borderRadius: 6,
              fontSize: 12,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
              pointerEvents: 'none',
              zIndex: 10,
              border: '1px solid var(--theme-elevation-700, #334155)',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 2 }}>
              {String(data[hoverIndex][xAxisKey])}
            </div>
            {visibleSeries.map((s) => {
              const val = Number(data[hoverIndex][s.key] || 0)
              const isMonetary =
                s.key.toLowerCase().includes('revenue') ||
                s.key.toLowerCase().includes('spend') ||
                s.key.toLowerCase().includes('sales') ||
                s.key.toLowerCase().includes('discount') ||
                s.key.toLowerCase().includes('gross') ||
                s.key.toLowerCase().includes('value') ||
                s.key.toLowerCase().includes('valuation') ||
                s.key.toLowerCase().includes('aov')
              const symbol = currency === 'BDT' ? '৳' : currency === 'USD' ? '$' : `${currency} `
              const displayVal = isMonetary
                ? `${symbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : val.toLocaleString('en-US')

              return (
                <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ color: s.color }}>{s.name}:</span>
                  <span style={{ fontWeight: 600 }}>{displayVal}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
