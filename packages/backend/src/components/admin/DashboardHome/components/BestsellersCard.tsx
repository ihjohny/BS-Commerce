'use client'

import React, { useState } from 'react'
import type { BestsellingProduct, TopEngagedProduct } from '../../../lib/admin-dashboard-stats'

type BestsellersCardProps = {
  bestsellers: BestsellingProduct[]
  topEngaged: TopEngagedProduct[]
  currency: string
}

function formatCurrency(amount: number, currency: string) {
  const symbol = currency === 'BDT' ? '৳' : currency === 'USD' ? '$' : `${currency} `
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function BestsellersCard({ bestsellers, topEngaged, currency }: BestsellersCardProps) {
  const [tab, setTab] = useState<'bestsellers' | 'engaged'>('bestsellers')

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
      {/* Header Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--theme-elevation-200)',
          paddingBottom: 8,
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setTab('bestsellers')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 13,
              fontWeight: tab === 'bestsellers' ? 700 : 500,
              color: tab === 'bestsellers' ? 'var(--theme-text)' : 'var(--theme-elevation-500)',
              cursor: 'pointer',
              padding: '4px 6px',
              borderBottom: tab === 'bestsellers' ? '2px solid var(--theme-text)' : '2px solid transparent',
              marginBottom: -9,
            }}
          >
            Bestsellers ({bestsellers.length})
          </button>
          <button
            onClick={() => setTab('engaged')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 13,
              fontWeight: tab === 'engaged' ? 700 : 500,
              color: tab === 'engaged' ? 'var(--theme-text)' : 'var(--theme-elevation-500)',
              cursor: 'pointer',
              padding: '4px 6px',
              borderBottom: tab === 'engaged' ? '2px solid var(--theme-text)' : '2px solid transparent',
              marginBottom: -9,
            }}
          >
            Wishlisted & Rated ({topEngaged.length})
          </button>
        </div>

        <a
          href="/admin/collections/products"
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-text)', textDecoration: 'none' }}
        >
          Catalog &rarr;
        </a>
      </div>

      {tab === 'bestsellers' && (
        <>
          {bestsellers.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400)', fontSize: 13 }}>
              No product sales in this period.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {bestsellers.map((item, idx) => (
                <a
                  key={item.id + idx}
                  href={`/admin/collections/products/${item.id}`}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 4,
                        background: 'var(--theme-elevation-200)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--theme-elevation-500)',
                      }}
                    >
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        `#${idx + 1}`
                      )}
                    </div>
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
                        {item.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--theme-elevation-500)' }}>
                        SKU: {item.sku || 'N/A'} &bull; {formatCurrency(item.price, currency)}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--theme-text)' }}>
                      {item.unitsSold} sold
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--theme-elevation-500)' }}>
                      {formatCurrency(item.revenue, currency)}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'engaged' && (
        <>
          {topEngaged.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400)', fontSize: 13 }}>
              No product engagement records yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {topEngaged.map((item, idx) => (
                <a
                  key={item.id + idx}
                  href={`/admin/collections/products/${item.id}`}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 4,
                        background: 'var(--theme-elevation-200)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--theme-elevation-500)',
                      }}
                    >
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        `#${idx + 1}`
                      )}
                    </div>
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
                        {item.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--theme-elevation-500)' }}>
                        SKU: {item.sku || 'N/A'} &bull; {formatCurrency(item.price, currency)}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-text)' }}>
                      {item.wishlistCount} saves
                    </div>
                    {item.rating > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--theme-elevation-500)' }}>
                        ★ {item.rating.toFixed(1)} ({item.totalReviews})
                      </div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
