'use client'

import React from 'react'
import Link from 'next/link'
import type { LowStockItem } from '../../../lib/admin-dashboard-stats'

type LowStockCardProps = {
  items: LowStockItem[]
}

export function LowStockCard({ items }: LowStockCardProps) {
  return (
    <div
      style={{
        borderRadius: 'var(--bs-radius-md, 8px)',
        border: '1px solid var(--theme-elevation-150)',
        background: 'var(--theme-elevation-50)',
        padding: '1.25rem 1.4rem',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--bs-shadow-xs)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--theme-elevation-150)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--theme-text)', letterSpacing: '-0.01em' }}>
              Low Stock Alerts
            </span>
            {items.length > 0 && (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 999,
                  background: 'rgba(220, 38, 38, 0.1)',
                  color: 'var(--bs-error, #dc2626)',
                }}
              >
                {items.length}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--theme-elevation-500)', marginTop: 2 }}>
            Items nearing or below reorder threshold
          </div>
        </div>

        <Link
          href="/admin/collections/stock-levels"
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--bs-primary, #2563eb)',
            textDecoration: 'none',
          }}
        >
          Inventory &rarr;
        </Link>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400)', fontSize: 13 }}>
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
                  borderRadius: 'var(--bs-radius-sm, 6px)',
                  background: 'var(--theme-elevation-100)',
                  border: '1px solid var(--theme-elevation-150)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isOutOfStock ? 'var(--bs-error, #dc2626)' : 'var(--bs-warning, #d97706)'
                  e.currentTarget.style.background = 'var(--theme-elevation-150)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--theme-elevation-150)'
                  e.currentTarget.style.background = 'var(--theme-elevation-100)'
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--theme-text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.productName} {item.variantName ? `(${item.variantName})` : ''}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--theme-elevation-500)',
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
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: isOutOfStock ? 'rgba(220, 38, 38, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                      color: isOutOfStock ? 'var(--bs-error, #dc2626)' : 'var(--bs-warning, #d97706)',
                    }}
                  >
                    {isOutOfStock ? 'Out of Stock' : `${item.quantity} In Stock`}
                  </span>
                  {item.reservedQuantity > 0 && (
                    <div style={{ fontSize: 10.5, color: 'var(--theme-elevation-450)', marginTop: 2 }}>
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
