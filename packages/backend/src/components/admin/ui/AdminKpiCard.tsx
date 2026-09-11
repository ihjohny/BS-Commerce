'use client'

import React, { useState } from 'react'
import Link from 'next/link'

export interface AdminKpiCardProps {
  label: string
  value: React.ReactNode
  change?: number | null
  sublabel?: React.ReactNode
  icon?: React.ReactNode
  href?: string
  badge?: React.ReactNode
  compact?: boolean
  className?: string
  style?: React.CSSProperties
  iconVariant?: 'neutral' | 'primary' | 'success' | 'warning' | 'purple'
  sparklinePoints?: number[]
  sparklineColor?: string
}

export function AdminKpiTrendBadge({ change }: { change?: number | null }) {
  if (change === null || change === undefined || isNaN(change)) return null

  const isPositive = change > 0
  const isZero = change === 0

  const color = isZero
    ? 'var(--theme-elevation-500, #64748b)'
    : isPositive
    ? 'var(--bs-success, #16a34a)'
    : 'var(--bs-error, #dc2626)'

  const bg = isZero
    ? 'var(--theme-elevation-150, #e2e8f0)'
    : isPositive
    ? 'var(--bs-success-subtle, rgba(22, 163, 74, 0.1))'
    : 'var(--bs-error-subtle, rgba(220, 38, 38, 0.1))'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: '0.6875rem', // 11px
        fontWeight: 600,
        color,
        background: bg,
        padding: '2px 7px',
        borderRadius: 'var(--bs-radius-full, 9999px)',
        lineHeight: 1.2,
      }}
    >
      {!isZero && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: isPositive ? 'none' : 'rotate(180deg)' }}
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      )}
      <span>{isPositive ? `+${change}%` : `${change}%`}</span>
    </span>
  )
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}

function MiniSparkline({
  points,
  color = 'var(--bs-primary, #2563eb)',
  height = 50,
  isHovered = false,
}: {
  points?: number[]
  color?: string
  height?: number
  isHovered?: boolean
}) {
  const gradientId = React.useId().replace(/:/g, '')

  const rawPoints = points && points.length > 0 ? points : [0, 0]
  const data = rawPoints.length === 1 ? [rawPoints[0], rawPoints[0]] : rawPoints

  const viewBoxWidth = 100
  const viewBoxHeight = 40

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min

  // Padding inside SVG so peak strokes never clip
  const topPad = 6
  const bottomPad = 2
  const usableHeight = viewBoxHeight - topPad - bottomPad

  const coords = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * viewBoxWidth
    const y =
      range === 0
        ? viewBoxHeight - bottomPad - usableHeight * 0.35
        : viewBoxHeight - bottomPad - ((val - min) / range) * usableHeight
    return { x, y }
  })

  // Build smooth Catmull-Rom to Cubic Bezier curve
  let pathD = `M ${coords[0].x.toFixed(2)},${coords[0].y.toFixed(2)}`
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? 0 : i - 1]
    const p1 = coords[i]
    const p2 = coords[i + 1]
    const p3 = coords[i + 2] || p2

    const cp1x = clamp(p1.x + (p2.x - p0.x) / 6, 0, viewBoxWidth)
    const cp1y = clamp(p1.y + (p2.y - p0.y) / 6, 1, viewBoxHeight - 1)
    const cp2x = clamp(p2.x - (p3.x - p1.x) / 6, 0, viewBoxWidth)
    const cp2y = clamp(p2.y - (p3.y - p1.y) / 6, 1, viewBoxHeight - 1)

    pathD += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`
  }

  const areaD = `${pathD} L ${viewBoxWidth},${viewBoxHeight} L 0,${viewBoxHeight} Z`

  return (
    <div
      style={{
        width: '100%',
        height,
        marginTop: 'auto',
        overflow: 'hidden',
        lineHeight: 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="none"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={isHovered ? 0.32 : 0.2} />
            <stop offset="85%" stopColor={color} stopOpacity={isHovered ? 0.08 : 0.03} />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path
          d={areaD}
          fill={`url(#${gradientId})`}
          style={{ transition: 'fill-opacity 0.25s ease' }}
        />
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transition: 'stroke-width 0.25s ease, opacity 0.25s ease',
            opacity: isHovered ? 1 : 0.9,
          }}
        />
      </svg>
    </div>
  )
}

export function AdminKpiCard({
  label,
  value,
  change,
  sublabel,
  icon,
  href,
  badge,
  compact = false,
  className,
  style,
  iconVariant = 'neutral',
  sparklinePoints,
  sparklineColor,
}: AdminKpiCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const hasSparkline = sparklinePoints !== undefined

  // Color mapping for icon variants matching Apex shadcn chart styles
  const getIconStyles = () => {
    switch (iconVariant) {
      case 'primary':
        return {
          bg: 'var(--bs-primary-subtle, rgba(37, 99, 235, 0.1))',
          color: 'var(--bs-primary, #2563eb)',
        }
      case 'success':
        return {
          bg: 'var(--bs-success-subtle, rgba(22, 163, 74, 0.1))',
          color: 'var(--bs-success, #16a34a)',
        }
      case 'warning':
        return {
          bg: 'var(--bs-warning-subtle, rgba(217, 119, 6, 0.1))',
          color: 'var(--bs-warning, #d97706)',
        }
      case 'purple':
        return {
          bg: 'rgba(124, 58, 237, 0.1)',
          color: '#7c3aed',
        }
      default:
        return {
          bg: 'var(--theme-elevation-100, #f1f5f9)',
          color: 'var(--theme-elevation-600, #64748b)',
        }
    }
  }

  const iconStyle = getIconStyles()
  const effectiveSparklineColor =
    sparklineColor ||
    (change && change < 0
      ? 'var(--bs-error, #dc2626)'
      : iconStyle.color || 'var(--bs-primary, #2563eb)')

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    textDecoration: 'none',
    color: 'inherit',
    padding: hasSparkline
      ? 0
      : compact
      ? '1rem 1.15rem'
      : '1.25rem 1.25rem 1.15rem 1.25rem',
    borderRadius: 'var(--bs-radius-lg, 12px)',
    border: `1px solid ${
      isHovered
        ? 'var(--bs-primary-border, rgba(37, 99, 235, 0.35))'
        : 'var(--theme-elevation-150, #e2e8f0)'
    }`,
    background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
    boxShadow: isHovered
      ? '0 6px 16px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)'
      : 'var(--bs-shadow-xs, 0 1px 2px 0 rgba(0, 0, 0, 0.03))',
    transform: isHovered && href ? 'translateY(-2px)' : 'none',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    cursor: href ? 'pointer' : 'default',
    minHeight: compact ? 92 : hasSparkline ? 146 : 124,
    position: 'relative',
    overflow: 'hidden',
    ...style,
  }

  const content = (
    <>
      {/* Upper Content Section with proper padding */}
      <div
        style={{
          padding: hasSparkline
            ? compact
              ? '1rem 1.15rem 0.25rem 1.15rem'
              : '1.25rem 1.25rem 0.25rem 1.25rem'
            : 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top Header Row: Metric Title & Value on Left, Icon on Right */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: compact ? 6 : 8,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontSize: 'var(--bs-font-xs, 0.75rem)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--theme-elevation-500, #64748b)',
                lineHeight: 1.2,
              }}
            >
              {label}
            </span>

            <div
              style={{
                fontSize: compact ? 'var(--bs-font-xl, 1.35rem)' : 'var(--bs-font-2xl, 1.625rem)',
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.025em',
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--theme-text, #0f172a)',
                marginTop: 2,
              }}
            >
              {value}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {badge}
            {icon && (
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: iconStyle.bg,
                  color: iconStyle.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'transform 0.2s ease',
                  transform: isHovered ? 'scale(1.08)' : 'none',
                }}
              >
                {icon}
              </div>
            )}
          </div>
        </div>

        {/* Trend + Sublabel Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            marginTop: 4,
          }}
        >
          <AdminKpiTrendBadge change={change} />
          {sublabel && (
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--theme-elevation-500, #64748b)',
                fontWeight: 400,
                lineHeight: 1.3,
              }}
            >
              {sublabel}
            </span>
          )}
        </div>
      </div>

      {/* Full-Width Edge-to-Edge Sparkline Area Chart taking entire bottom of box */}
      {hasSparkline && (
        <MiniSparkline
          points={sparklinePoints}
          color={effectiveSparklineColor}
          height={compact ? 38 : 50}
          isHovered={isHovered}
        />
      )}
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className={`admin-kpi-card ${className || ''}`.trim()}
        style={cardStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {content}
      </Link>
    )
  }

  return (
    <div
      className={`admin-kpi-card ${className || ''}`.trim()}
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {content}
    </div>
  )
}

export default AdminKpiCard
