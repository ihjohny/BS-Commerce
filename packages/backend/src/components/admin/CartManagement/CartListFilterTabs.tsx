'use client'

import React, { useMemo, useEffect } from 'react'
import { useListQuery } from '@payloadcms/ui'

import { AdminQuickFilterBar, type AdminFilterTab } from '../ui'

export type CartFilterTabKey = 'all' | 'registered' | 'guest'

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

  const tabs: AdminFilterTab<CartFilterTabKey>[] = [
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

  // Dynamically synchronize the search input placeholder & aria-label on the carts list page
  useEffect(() => {
    const hint = 'Search by email, phone, guest ID...'
    const updateInputPlaceholder = () => {
      const inputs = document.querySelectorAll<HTMLInputElement>(
        '#search-filter-input, input.search-filter__input, .list-controls input[type="text"]'
      )
      inputs.forEach((input) => {
        if (input && input.placeholder !== hint) {
          input.placeholder = hint
          input.setAttribute('aria-label', hint)
        }
      })
    }

    updateInputPlaceholder()

    const observer = new MutationObserver((mutations) => {
      let hasAddedNodes = false
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          hasAddedNodes = true
          break
        }
      }
      if (hasAddedNodes) {
        updateInputPlaceholder()
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  const handleFocusSearch = () => {
    const input = document.querySelector<HTMLInputElement>(
      '#search-filter-input, input.search-filter__input, .list-controls input[type="text"]'
    )
    if (input) {
      input.focus()
    }
  }

  return (
    <AdminQuickFilterBar<CartFilterTabKey>
      tabs={tabs}
      activeTab={currentTab}
      onSelectTab={setFilterTab}
      rightAction={
        <div
          onClick={handleFocusSearch}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleFocusSearch()
            }
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.75rem',
            color: 'var(--theme-elevation-600, #475569)',
            background: 'var(--theme-elevation-100, #f1f5f9)',
            border: '1px solid var(--theme-elevation-200, #e2e8f0)',
            padding: '0.35rem 0.75rem',
            borderRadius: 6,
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'all 0.15s ease',
          }}
          title="Click to search carts by customer email, phone number, or guest ID"
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--bs-primary-border, rgba(37, 99, 235, 0.35))'
            e.currentTarget.style.background = 'var(--theme-elevation-150, #e2e8f0)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--theme-elevation-200, #e2e8f0)'
            e.currentTarget.style.background = 'var(--theme-elevation-100, #f1f5f9)'
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--bs-primary, #2563eb)' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>
            Search hint:{' '}
            <strong style={{ fontWeight: 600, color: 'var(--theme-text)' }}>
              Email, Phone, Guest ID
            </strong>
          </span>
        </div>
      }
    />
  )
}

export default CartListFilterTabs
