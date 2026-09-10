'use client'

import React, { useMemo } from 'react'
import { useListQuery } from '@payloadcms/ui'

export type CartFilterTabKey = 'all' | 'registered' | 'guest'

interface CartTabDef {
  id: CartFilterTabKey
  label: string
  color: string
  activeBg: string
  icon: React.ReactNode
}

/**
 * Client component rendered via admin.components.beforeListTable on the `carts` collection.
 * Provides a synchronized "QUICK FILTER:" bar for carts (All, Registered, Guest)
 * with color-coded badges, SVG icons, and full dark/light mode synchronization.
 */
export function CartListFilterTabs() {
  const { handleWhereChange, query } = useListQuery()

  // Determine currently active tab from Payload list query state
  const currentTab: CartFilterTabKey = useMemo(() => {
    const where = query?.where as any
    if (!where) return 'all'

    const checkCondition = (c: any): CartFilterTabKey | null => {
      if (!c) return null

      // Guest cart conditions (user is null or does not exist, or guestId exists)
      if (c.user?.exists === false || c.user?.exists === 'false') return 'guest'
      if (c.user?.equals === null || c.user?.equals === 'null') return 'guest'
      if (c.guestId?.exists === true || c.guestId?.exists === 'true') return 'guest'
      if (c.guestId?.not_equals === null || c.guestId?.not_equals === 'null') return 'guest'

      // Registered cart conditions (user is not null or exists, or guestId is null)
      if (c.user?.exists === true || c.user?.exists === 'true') return 'registered'
      if (c.user?.not_equals === null || c.user?.not_equals === 'null') return 'registered'
      if (c.guestId?.exists === false || c.guestId?.exists === 'false') return 'registered'
      if (c.guestId?.equals === null || c.guestId?.equals === 'null') return 'registered'

      return null
    }

    const direct = checkCondition(where)
    if (direct) return direct

    if (Array.isArray(where.and)) {
      for (const cond of where.and) {
        const res = checkCondition(cond)
        if (res) return res
      }
    }

    if (Array.isArray(where.or)) {
      for (const cond of where.or) {
        const res = checkCondition(cond)
        if (res) return res
      }
    }

    return 'all'
  }, [query?.where])

  const setFilterTab = (tab: CartFilterTabKey) => {
    if (typeof handleWhereChange !== 'function') return

    if (tab === 'all') {
      handleWhereChange({} as any)
      return
    }

    if (tab === 'registered') {
      handleWhereChange({
        user: { exists: true },
      } as any)
      return
    }

    if (tab === 'guest') {
      handleWhereChange({
        user: { exists: false },
      } as any)
      return
    }
  }

  const tabs: CartTabDef[] = [
    {
      id: 'all',
      label: 'All Carts',
      color: 'var(--theme-elevation-700, #334155)',
      activeBg: 'var(--bs-primary, #2563eb)',
      icon: (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
      ),
    },
    {
      id: 'registered',
      label: 'Registered',
      color: 'var(--bs-success, #16a34a)',
      activeBg: 'var(--bs-success, #16a34a)',
      icon: (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </svg>
      ),
    },
    {
      id: 'guest',
      label: 'Guest',
      color: '#8b5cf6',
      activeBg: '#7c3aed',
      icon: (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
          <circle cx="12" cy="7" r="4" />
          <line x1="12" y1="13" x2="12" y2="17" />
          <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3" />
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
          QUICK FILTER:
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

export default CartListFilterTabs
