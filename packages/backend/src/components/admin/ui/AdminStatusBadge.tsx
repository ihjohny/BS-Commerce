'use client'

import React from 'react'

export type StatusBadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'purple'
  | 'neutral'

export type StatusBadgeType = 'order' | 'payment' | 'user' | 'cart' | 'status' | 'custom'

export interface AdminStatusBadgeProps {
  status: string
  type?: StatusBadgeType
  variant?: StatusBadgeVariant
  label?: string
  showDot?: boolean
  size?: 'sm' | 'md'
  className?: string
  style?: React.CSSProperties
  prefix?: string
}

export function formatStatusLabel(status: string): string {
  if (!status) return ''
  return status
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function resolveVariant(status: string, type: StatusBadgeType, explicitVariant?: StatusBadgeVariant): StatusBadgeVariant {
  if (explicitVariant && explicitVariant !== 'default') return explicitVariant

  const s = (status || '').toLowerCase().trim()

  // Success states
  if (['delivered', 'completed', 'paid', 'active', 'verified'].includes(s)) {
    return 'success'
  }

  // Warning states
  if (['pending', 'unpaid', 'partially-paid', 'partially_paid', 'warning', 'low_stock'].includes(s)) {
    return 'warning'
  }

  // Primary / Info states
  if (['processing', 'registered'].includes(s)) {
    return 'info'
  }

  // Purple / Transit / Guest states
  if (['shipped', 'partially-shipped', 'partially_shipped', 'guest', 'in-transit'].includes(s)) {
    return 'purple'
  }

  // Error / Destructive states
  if (['cancelled', 'refunded', 'suspended', 'banned', 'expired', 'failed'].includes(s)) {
    return 'error'
  }

  return 'neutral'
}

const VARIANT_STYLES: Record<
  StatusBadgeVariant,
  { color: string; bg: string; border: string; dot: string }
> = {
  default: {
    color: 'var(--theme-elevation-600, #64748b)',
    bg: 'var(--theme-elevation-100, rgba(100, 116, 139, 0.08))',
    border: 'var(--theme-elevation-200, rgba(100, 116, 139, 0.18))',
    dot: 'var(--theme-elevation-500, #64748b)',
  },
  neutral: {
    color: 'var(--theme-elevation-600, #64748b)',
    bg: 'var(--theme-elevation-100, rgba(100, 116, 139, 0.08))',
    border: 'var(--theme-elevation-200, rgba(100, 116, 139, 0.18))',
    dot: 'var(--theme-elevation-500, #64748b)',
  },
  success: {
    color: 'var(--bs-success, #16a34a)',
    bg: 'var(--bs-success-subtle, rgba(22, 163, 74, 0.1))',
    border: 'rgba(22, 163, 74, 0.22)',
    dot: 'var(--bs-success, #16a34a)',
  },
  warning: {
    color: 'var(--bs-warning, #d97706)',
    bg: 'var(--bs-warning-subtle, rgba(217, 119, 6, 0.1))',
    border: 'rgba(217, 119, 6, 0.22)',
    dot: 'var(--bs-warning, #d97706)',
  },
  info: {
    color: 'var(--bs-primary, #2563eb)',
    bg: 'var(--bs-primary-subtle, rgba(37, 99, 235, 0.1))',
    border: 'var(--bs-primary-border, rgba(37, 99, 235, 0.22))',
    dot: 'var(--bs-primary, #2563eb)',
  },
  purple: {
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.1)',
    border: 'rgba(99, 102, 241, 0.22)',
    dot: '#6366f1',
  },
  error: {
    color: 'var(--bs-error, #dc2626)',
    bg: 'var(--bs-error-subtle, rgba(220, 38, 38, 0.1))',
    border: 'rgba(220, 38, 38, 0.22)',
    dot: 'var(--bs-error, #dc2626)',
  },
}

export function AdminStatusBadge({
  status,
  type = 'custom',
  variant: explicitVariant,
  label,
  showDot = true,
  size = 'sm',
  className,
  style,
  prefix,
}: AdminStatusBadgeProps) {
  const variant = resolveVariant(status, type, explicitVariant)
  const token = VARIANT_STYLES[variant]

  const displayLabel =
    label ??
    (prefix
      ? `${prefix}: ${formatStatusLabel(status)}`
      : type === 'payment'
      ? `Payment: ${formatStatusLabel(status)}`
      : formatStatusLabel(status))

  const isSmall = size === 'sm'

  return (
    <span
      className={`admin-status-badge ${className || ''}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? 5 : 6,
        fontSize: isSmall ? '0.71875rem' : '0.78125rem', // 11.5px vs 12.5px
        fontWeight: 600,
        lineHeight: 1,
        padding: isSmall ? '3px 8.5px' : '4px 10.5px',
        borderRadius: 'var(--bs-radius-full, 9999px)',
        background: token.bg,
        color: token.color,
        border: `1px solid ${token.border}`,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
        transition: 'all 0.15s ease',
        ...style,
      }}
    >
      {showDot && (
        <span
          style={{
            width: isSmall ? 5.5 : 6.5,
            height: isSmall ? 5.5 : 6.5,
            borderRadius: '50%',
            background: token.dot,
            flexShrink: 0,
          }}
        />
      )}
      <span>{displayLabel}</span>
    </span>
  )
}

export default AdminStatusBadge
