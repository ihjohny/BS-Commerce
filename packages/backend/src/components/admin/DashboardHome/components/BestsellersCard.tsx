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
  const num = Number(amount || 0)
  const hasDecimals = num % 1 !== 0
  return `${symbol}${num.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}

export function BestsellersCard({ bestsellers, topEngaged, currency }: BestsellersCardProps) {
  const [tab, setTab] = useState<'bestsellers' | 'engaged'>('bestsellers')

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
      {/* Header Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
          paddingBottom: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: 2,
            borderRadius: 'var(--bs-radius-sm, 7px)',
            background: 'var(--theme-elevation-100, #f1f5f9)',
            border: '1px solid var(--theme-elevation-150, #e2e8f0)',
            gap: 2,
          }}
        >
          <button
            type="button"
            onClick={() => setTab('bestsellers')}
            style={{
              borderRadius: 'var(--bs-radius-xs, 5px)',
              fontSize: 'var(--bs-font-sm, 0.8125rem)',
              fontWeight: tab === 'bestsellers' ? 600 : 500,
              color: tab === 'bestsellers' ? 'var(--theme-text, #0f172a)' : 'var(--theme-elevation-600, #64748b)',
              background: tab === 'bestsellers' ? 'var(--theme-elevation-0, #ffffff)' : 'transparent',
              border: 'none',
              boxShadow: tab === 'bestsellers' ? '0 1px 2px rgba(0, 0, 0, 0.06)' : 'none',
              cursor: 'pointer',
              padding: '4px 12px',
              transition: 'all 0.12s ease',
            }}
          >
            Top Sellers ({bestsellers.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('engaged')}
            style={{
              borderRadius: 'var(--bs-radius-xs, 5px)',
              fontSize: 'var(--bs-font-sm, 0.8125rem)',
              fontWeight: tab === 'engaged' ? 600 : 500,
              color: tab === 'engaged' ? 'var(--theme-text, #0f172a)' : 'var(--theme-elevation-600, #64748b)',
              background: tab === 'engaged' ? 'var(--theme-elevation-0, #ffffff)' : 'transparent',
              border: 'none',
              boxShadow: tab === 'engaged' ? '0 1px 2px rgba(0, 0, 0, 0.06)' : 'none',
              cursor: 'pointer',
              padding: '4px 12px',
              transition: 'all 0.12s ease',
            }}
          >
            Customer Interest ({topEngaged.length})
          </button>
        </div>

        <Link
          href="/admin/collections/products"
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
          <span>Catalog</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {tab === 'bestsellers' && (
        <>
          {bestsellers.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400, #94a3b8)', fontSize: 'var(--bs-font-sm, 0.8125rem)' }}>
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
                    borderRadius: 'var(--bs-radius-sm, 7px)',
                    background: 'var(--theme-elevation-50, #f8fafc)',
                    border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--bs-primary, #2563eb)'
                    e.currentTarget.style.background = 'var(--theme-elevation-0, #ffffff)'
                    e.currentTarget.style.boxShadow = 'var(--bs-shadow-xs)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--theme-elevation-150, #e2e8f0)'
                    e.currentTarget.style.background = 'var(--theme-elevation-50, #f8fafc)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        background: 'var(--theme-elevation-150, #e2e8f0)',
                        border: '1px solid var(--theme-elevation-200, #cbd5e1)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'var(--bs-font-xs, 0.75rem)',
                        fontWeight: 700,
                        color: idx < 3 ? 'var(--bs-primary, #2563eb)' : 'var(--theme-elevation-500, #64748b)',
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
                          fontSize: 'var(--bs-font-base, 0.875rem)',
                          fontWeight: 600,
                          color: 'var(--theme-text, #0f172a)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', color: 'var(--theme-elevation-500, #64748b)', marginTop: 2 }}>
                        {item.sku ? <span style={{ fontFamily: 'monospace' }}>{item.sku}</span> : 'No SKU'} &bull; {formatCurrency(item.price, currency)}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 'var(--bs-font-base, 0.875rem)', fontWeight: 700, color: 'var(--theme-text, #0f172a)', fontVariantNumeric: 'tabular-nums' }}>
                      {item.unitsSold} <span style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', fontWeight: 500, color: 'var(--theme-elevation-500, #64748b)' }}>sold</span>
                    </div>
                    <div style={{ fontSize: 'var(--bs-font-sm, 0.8125rem)', fontWeight: 600, color: 'var(--bs-primary, #2563eb)', marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>
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
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400, #94a3b8)', fontSize: 'var(--bs-font-sm, 0.8125rem)' }}>
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
                    borderRadius: 'var(--bs-radius-sm, 7px)',
                    background: 'var(--theme-elevation-50, #f8fafc)',
                    border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--bs-primary, #2563eb)'
                    e.currentTarget.style.background = 'var(--theme-elevation-0, #ffffff)'
                    e.currentTarget.style.boxShadow = 'var(--bs-shadow-xs)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--theme-elevation-150, #e2e8f0)'
                    e.currentTarget.style.background = 'var(--theme-elevation-50, #f8fafc)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        background: 'var(--theme-elevation-150, #e2e8f0)',
                        border: '1px solid var(--theme-elevation-200, #cbd5e1)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'var(--bs-font-xs, 0.75rem)',
                        fontWeight: 700,
                        color: 'var(--theme-elevation-500, #64748b)',
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
                          fontSize: 'var(--bs-font-base, 0.875rem)',
                          fontWeight: 600,
                          color: 'var(--theme-text, #0f172a)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', color: 'var(--theme-elevation-500, #64748b)', marginTop: 2 }}>
                        {item.sku ? <span style={{ fontFamily: 'monospace' }}>{item.sku}</span> : 'No SKU'} &bull; {formatCurrency(item.price, currency)}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 'var(--bs-font-sm, 0.8125rem)', fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>
                      {item.wishlistCount} <span style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', color: 'var(--theme-elevation-500, #64748b)' }}>wishlists</span>
                    </div>
                    {item.rating > 0 && (
                      <div style={{ fontSize: 'var(--bs-font-sm, 0.8125rem)', fontWeight: 600, color: '#d97706', marginTop: 1 }}>
                        ★ {item.rating.toFixed(1)} <span style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', color: 'var(--theme-elevation-500, #64748b)' }}>({item.totalReviews})</span>
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

