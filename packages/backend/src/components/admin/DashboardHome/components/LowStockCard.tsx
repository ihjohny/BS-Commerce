'use client'

import React from 'react'
import Link from 'next/link'
import type { LowStockItem } from '../../../../lib/admin-dashboard-stats'
import { AdminStatusBadge } from '../../ui'

type LowStockCardProps = {
  items: LowStockItem[]
}

export function LowStockCard({ items }: LowStockCardProps) {
  return (
    <div
      style={{
        borderRadius: 'var(--bs-radius-lg, 12px)',
        border: '1px solid var(--theme-elevation-150, #e2e8f0)',
        background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
        padding: '1.25rem 1.4rem',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--bs-shadow-xs, 0 1px 2px 0 rgba(0, 0, 0, 0.03))',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 'var(--bs-font-md, 0.9375rem)', fontWeight: 600, color: 'var(--theme-text, #0f172a)', letterSpacing: '-0.015em' }}>
              Low Stock Alerts
            </span>
            {items.length > 0 && (
              <span
                style={{
                  fontSize: 'var(--bs-font-2xs, 0.6875rem)',
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: 'var(--bs-radius-full, 9999px)',
                  background: 'var(--bs-error-subtle, rgba(220, 38, 38, 0.1))',
                  color: 'var(--bs-error, #dc2626)',
                  border: '1px solid var(--bs-error-subtle, rgba(220, 38, 38, 0.2))',
                }}
              >
                {items.length}
              </span>
            )}
          </div>
          <div style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', color: 'var(--theme-elevation-500, #64748b)', marginTop: 2 }}>
            Items nearing or below reorder threshold
          </div>
        </div>

        <Link
          href="/admin/collections/stock-levels"
          style={{
            fontSize: 'var(--bs-font-sm, 0.8125rem)',
            fontWeight: 600,
            color: 'var(--bs-primary, #2563eb)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>Inventory</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400, #94a3b8)', fontSize: 'var(--bs-font-sm, 0.8125rem)' }}>
          All products have sufficient stock levels.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {items.map((item) => {
            const isOutOfStock = item.status === 'out_of_stock' || item.quantity <= 0

            return (
              <a
                key={item.id}
                href={`/admin/collections/stock-levels/${item.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  textDecoration: 'none',
                  color: 'inherit',
                  padding: '8px 10px',
                  borderRadius: 'var(--bs-radius-sm, 7px)',
                  background: 'var(--theme-elevation-50, #f8fafc)',
                  border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isOutOfStock ? 'var(--bs-error, #dc2626)' : 'var(--bs-warning, #d97706)'
                  e.currentTarget.style.background = 'var(--theme-elevation-0, #ffffff)'
                  e.currentTarget.style.boxShadow = 'var(--bs-shadow-xs)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--theme-elevation-150, #e2e8f0)'
                  e.currentTarget.style.background = 'var(--theme-elevation-50, #f8fafc)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 'var(--bs-font-base, 0.875rem)',
                      fontWeight: 600,
                      color: 'var(--theme-text, #0f172a)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.productName} {item.variantName ? `(${item.variantName})` : ''}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--bs-font-xs, 0.75rem)',
                      color: 'var(--theme-elevation-500, #64748b)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: 2,
                    }}
                  >
                    {item.locationName} &bull; <span style={{ fontFamily: 'monospace' }}>{item.sku || 'No SKU'}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <AdminStatusBadge
                    status={isOutOfStock ? 'out_of_stock' : 'low_stock'}
                    variant={isOutOfStock ? 'error' : 'warning'}
                    label={isOutOfStock ? 'Out of Stock' : `${item.quantity} In Stock`}
                  />
                  {item.reservedQuantity > 0 && (
                    <div style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', color: 'var(--theme-elevation-500, #64748b)', marginTop: 2 }}>
                      ({item.reservedQuantity} reserved)
                    </div>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

