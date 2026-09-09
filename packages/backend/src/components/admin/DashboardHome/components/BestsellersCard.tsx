'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import type { BestsellingProduct, TopEngagedProduct } from '../../../../lib/admin-dashboard-stats'

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
        borderRadius: 12,
        border: '1px solid var(--theme-elevation-150)',
        background: 'var(--theme-elevation-0, var(--theme-bg))',
        padding: '1.25rem 1.4rem',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Header Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--theme-elevation-150)',
          paddingBottom: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: 2,
            borderRadius: 7,
            background: 'var(--theme-elevation-100)',
            border: '1px solid var(--theme-elevation-150)',
            gap: 1,
          }}
        >
          <button
            onClick={() => setTab('bestsellers')}
            style={{
              borderRadius: 5,
              fontSize: 12,
              fontWeight: tab === 'bestsellers' ? 600 : 500,
              color: tab === 'bestsellers' ? 'var(--theme-text)' : 'var(--theme-elevation-600)',
              background: tab === 'bestsellers' ? 'var(--theme-elevation-0, var(--theme-bg))' : 'transparent',
              border: 'none',
              boxShadow: tab === 'bestsellers' ? '0 1px 2px rgba(0, 0, 0, 0.06)' : 'none',
              cursor: 'pointer',
              padding: '3px 9px',
              transition: 'all 0.12s ease',
            }}
          >
            Bestsellers ({bestsellers.length})
          </button>
          <button
            onClick={() => setTab('engaged')}
            style={{
              borderRadius: 5,
              fontSize: 12,
              fontWeight: tab === 'engaged' ? 600 : 500,
              color: tab === 'engaged' ? 'var(--theme-text)' : 'var(--theme-elevation-600)',
              background: tab === 'engaged' ? 'var(--theme-elevation-0, var(--theme-bg))' : 'transparent',
              border: 'none',
              boxShadow: tab === 'engaged' ? '0 1px 2px rgba(0, 0, 0, 0.06)' : 'none',
              cursor: 'pointer',
              padding: '3px 9px',
              transition: 'all 0.12s ease',
            }}
          >
            Wishlisted & Rated ({topEngaged.length})
          </button>
        </div>

        <Link
          href="/admin/collections/products"
          style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--bs-primary, #2563eb)', textDecoration: 'none' }}
        >
          Catalog &rarr;
        </Link>
      </div>

      {tab === 'bestsellers' && (
        <>
          {bestsellers.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400)', fontSize: 13 }}>
              No product sales recorded in this period.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                    borderRadius: 'var(--bs-radius-sm, 6px)',
                    background: 'var(--theme-elevation-100)',
                    border: '1px solid var(--theme-elevation-150)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--bs-primary, #2563eb)'
                    e.currentTarget.style.background = 'var(--theme-elevation-150)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--theme-elevation-150)'
                    e.currentTarget.style.background = 'var(--theme-elevation-100)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        background: 'var(--theme-elevation-150)',
                        border: '1px solid var(--theme-elevation-200)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        color: idx < 3 ? 'var(--theme-text)' : 'var(--theme-elevation-500)',
                        fontVariantNumeric: 'tabular-nums',
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
                      <div style={{ fontSize: 11, color: 'var(--theme-elevation-500)', marginTop: 2 }}>
                        {item.sku ? <span style={{ fontFamily: 'monospace' }}>{item.sku}</span> : 'No SKU'} &bull; {formatCurrency(item.price, currency)}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--theme-text)', fontVariantNumeric: 'tabular-nums' }}>
                      {item.unitsSold} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--theme-elevation-500)' }}>sold</span>
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--bs-primary, #2563eb)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
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
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400)', fontSize: 13 }}>
              No product engagement records yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                    borderRadius: 'var(--bs-radius-sm, 6px)',
                    background: 'var(--theme-elevation-100)',
                    border: '1px solid var(--theme-elevation-150)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--bs-primary, #2563eb)'
                    e.currentTarget.style.background = 'var(--theme-elevation-150)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--theme-elevation-150)'
                    e.currentTarget.style.background = 'var(--theme-elevation-100)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        background: 'var(--theme-elevation-150)',
                        border: '1px solid var(--theme-elevation-200)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--theme-elevation-500)',
                        fontVariantNumeric: 'tabular-nums',
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
                      <div style={{ fontSize: 11, color: 'var(--theme-elevation-500)', marginTop: 2 }}>
                        {item.sku ? <span style={{ fontFamily: 'monospace' }}>{item.sku}</span> : 'No SKU'} &bull; {formatCurrency(item.price, currency)}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-text)' }}>
                      {item.wishlistCount} <span style={{ fontSize: 11, color: 'var(--theme-elevation-500)' }}>saves</span>
                    </div>
                    {item.rating > 0 && (
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#f59e0b', marginTop: 2 }}>
                        ★ {item.rating.toFixed(1)} <span style={{ fontSize: 10.5, color: 'var(--theme-elevation-500)' }}>({item.totalReviews})</span>
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
