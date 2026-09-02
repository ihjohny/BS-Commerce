'use client'

import React from 'react'
import type { LowStockItem } from '../../../lib/admin-dashboard-stats'

type LowStockCardProps = {
  items: LowStockItem[]
}

export function LowStockCard({ items }: LowStockCardProps) {
  return (
    <div
      style={{
        borderRadius: 8,
        border: '1px solid var(--theme-elevation-200)',
        background: 'var(--theme-elevation-50)',
        padding: '1.25rem 1.4rem',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.85rem',
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--theme-text)' }}>
            Low Stock Alerts
          </div>
          <div style={{ fontSize: 12, color: 'var(--theme-elevation-500)', marginTop: 2 }}>
            Inventory below reorder threshold
          </div>
        </div>

        <a
          href="/admin/collections/stock-levels"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--theme-text)',
            textDecoration: 'none',
          }}
        >
          Manage &rarr;
        </a>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400)', fontSize: 13 }}>
          All products have sufficient stock levels.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
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
                  borderRadius: 6,
                  background: 'var(--theme-elevation-100)',
                  border: '1px solid var(--theme-elevation-150, rgba(120,120,120,0.08))',
                }}
              >
                <div style={{ minWidth: 0 }}>
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
                    }}
                  >
                    {item.locationName} &bull; SKU: {item.sku || 'N/A'}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: isOutOfStock ? 'rgba(220, 38, 38, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                      color: isOutOfStock ? 'var(--theme-error-500, #dc2626)' : 'var(--theme-warning-500, #d97706)',
                    }}
                  >
                    {isOutOfStock ? 'Out of Stock' : `${item.quantity} Left`}
                  </span>
                  {item.reservedQuantity > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--theme-elevation-450, #888)', marginTop: 2 }}>
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
