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

function MiniSparkline({ points, color = 'var(--bs-primary, #2563eb)' }: { points: number[]; color?: string }) {
  if (!points || points.length < 2) return null

  const width = 120
  const height = 30
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1

  const coords = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * width
    const y = height - 4 - ((val - min) / range) * (height - 8)
    return { x, y }
  })

  // Build SVG path
  let pathD = `M ${coords[0].x},${coords[0].y}`
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i]
    const p2 = coords[i + 1]
    const mx = (p1.x + p2.x) / 2
    pathD += ` C ${mx},${p1.y} ${mx},${p2.y} ${p2.x},${p2.y}`
  }

  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`

  return (
    <div style={{ width: '100%', height: 32, marginTop: 4, overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <linearGradient id={`kpiSparkGradient-${color.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#kpiSparkGradient-${color.replace(/[^a-zA-Z0-9]/g, '')})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
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

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    textDecoration: 'none',
    color: 'inherit',
    padding: compact ? '1rem 1.15rem' : '1.25rem 1.25rem 0.85rem 1.25rem',
    borderRadius: 'var(--bs-radius-lg, 12px)',
    border: `1px solid ${
      isHovered
        ? 'var(--bs-primary-border, rgba(37, 99, 235, 0.35))'
        : 'var(--theme-elevation-150, #e2e8f0)'
    }`,
    background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
    boxShadow: isHovered
      ? '0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)'
      : 'var(--bs-shadow-xs, 0 1px 2px 0 rgba(0, 0, 0, 0.03))',
    transform: isHovered && href ? 'translateY(-1px)' : 'none',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    cursor: href ? 'pointer' : 'default',
    minHeight: compact ? 92 : 124,
    position: 'relative',
    overflow: 'hidden',
    ...style,
  }

  const content = (
    <>
      {/* Top Header Row: Label + Icon / Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: compact ? 6 : 10,
        }}
      >
        <span
          style={{
            fontSize: 'var(--bs-font-xs, 0.75rem)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--theme-elevation-500, #64748b)',
            lineHeight: 1.3,
          }}
        >
          {label}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {badge}
          {icon && (
            <div
              style={{
                width: 32,
                height: 32,
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

      {/* Middle Value + Trend Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: sublabel ? 4 : 2,
        }}
      >
        <div
          style={{
            fontSize: compact ? 'var(--bs-font-xl, 1.35rem)' : 'var(--bs-font-2xl, 1.625rem)',
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.025em',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--theme-text, #0f172a)',
          }}
        >
          {value}
        </div>
        <AdminKpiTrendBadge change={change} />
      </div>

      {/* Bottom Sublabel / Help text */}
      {sublabel && (
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--theme-elevation-500, #64748b)',
            fontWeight: 400,
            lineHeight: 1.35,
          }}
        >
          {sublabel}
        </div>
      )}

      {/* Subtle Bottom Sparkline (if provided) */}
      {sparklinePoints && sparklinePoints.length > 1 && (
        <MiniSparkline
          points={sparklinePoints}
          color={
            sparklineColor ||
            (change && change < 0
              ? 'var(--bs-error, #dc2626)'
              : iconStyle.color || 'var(--bs-primary, #2563eb)')
          }
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
