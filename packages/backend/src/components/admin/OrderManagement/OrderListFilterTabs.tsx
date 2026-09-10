'use client'

import React, { useMemo } from 'react'
import { useListQuery } from '@payloadcms/ui'

export type OrderFilterTabKey =
  | 'all'
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'

interface OrderTabDef {
  id: OrderFilterTabKey
  label: string
  color: string
  activeBg: string
  icon: React.ReactNode
}

/**
 * Client component rendered via admin.components.beforeListTable on the `orders` collection.
 * Provides a synchronized "Quick Filter:" bar for order statuses with color-coded badges & icons.
 */
export function OrderListFilterTabs() {
  const { handleWhereChange, query } = useListQuery()

  // Determine currently active tab from Payload list query state
  const currentTab: OrderFilterTabKey = useMemo(() => {
    const where = query?.where as any
    if (!where) return 'all'

    // Direct status equals check
    if (typeof where.status?.equals === 'string') {
      const val = where.status.equals.toLowerCase()
      if (['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'].includes(val)) {
        return val as OrderFilterTabKey
      }
    }

    // Direct status in check
    if (Array.isArray(where.status?.in) && where.status.in.length === 1) {
      const val = String(where.status.in[0]).toLowerCase()
      if (['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'].includes(val)) {
        return val as OrderFilterTabKey
      }
    }

    // Check inside 'and' array if present
    if (Array.isArray(where.and)) {
      for (const cond of where.and) {
        if (typeof cond?.status?.equals === 'string') {
          const val = cond.status.equals.toLowerCase()
          if (['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'].includes(val)) {
            return val as OrderFilterTabKey
          }
        }
        if (Array.isArray(cond?.status?.in) && cond.status.in.length === 1) {
          const val = String(cond.status.in[0]).toLowerCase()
          if (['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'].includes(val)) {
            return val as OrderFilterTabKey
          }
        }
      }
    }

    return 'all'
  }, [query?.where])

  const setFilterTab = (tab: OrderFilterTabKey) => {
    if (typeof handleWhereChange !== 'function') return

    if (tab === 'all') {
      handleWhereChange({} as any)
      return
    }

    handleWhereChange({
      status: { equals: tab },
    } as any)
  }

  const tabs: OrderTabDef[] = [
    {
      id: 'all',
      label: 'All Orders',
      color: 'var(--theme-elevation-700, #334155)',
      activeBg: 'var(--bs-primary, #2563eb)',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      id: 'pending',
      label: 'Pending',
      color: 'var(--bs-warning, #d97706)',
      activeBg: '#d97706',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      id: 'processing',
      label: 'Processing',
      color: 'var(--bs-primary, #2563eb)',
      activeBg: '#2563eb',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.24" />
          <path d="M21 3v6h-6" />
        </svg>
      ),
    },
    {
      id: 'shipped',
      label: 'Shipped',
      color: '#6366f1',
      activeBg: '#4f46e5',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
          <path d="M15 18H9" />
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
          <circle cx="17" cy="18.5" r="2.5" />
          <circle cx="7" cy="18.5" r="2.5" />
        </svg>
      ),
    },
    {
      id: 'delivered',
      label: 'Delivered',
      color: 'var(--bs-success, #16a34a)',
      activeBg: '#16a34a',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      id: 'completed',
      label: 'Completed',
      color: '#059669',
      activeBg: '#059669',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    },
    {
      id: 'cancelled',
      label: 'Cancelled',
      color: 'var(--theme-elevation-600, #64748b)',
      activeBg: '#64748b',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      ),
    },
    {
      id: 'refunded',
      label: 'Refunded',
      color: 'var(--bs-error, #dc2626)',
      activeBg: '#dc2626',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      ),
    },
  ]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.65rem 0.95rem',
        marginBottom: '0.85rem',
        background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
        border: '1px solid var(--theme-elevation-150, #e2e8f0)',
        borderRadius: 10,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--theme-elevation-500, #64748b)',
            marginRight: '0.35rem',
          }}
        >
          Quick Filter:
        </span>

        {tabs.map((t) => {
          const isActive = currentTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilterTab(t.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.4rem 0.85rem',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#ffffff' : 'var(--theme-elevation-700, #334155)',
                background: isActive
                  ? t.activeBg
                  : 'var(--theme-elevation-100, #f1f5f9)',
                border: isActive
                  ? `1px solid ${t.activeBg}`
                  : '1px solid var(--theme-elevation-200, #e2e8f0)',
                borderRadius: 6,
                cursor: 'pointer',
                boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.15)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: isActive ? '#ffffff' : t.color,
                }}
              >
                {t.icon}
              </span>
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OrderListFilterTabs
