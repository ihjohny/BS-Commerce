'use client'

import React, { useState } from 'react'
import type { RecentReview, ActiveCoupon } from '../../../lib/admin-dashboard-stats'

type FeedbackPromotionsCardProps = {
  reviews: RecentReview[]
  coupons: ActiveCoupon[]
  currency: string
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

export function FeedbackPromotionsCard({ reviews, coupons, currency }: FeedbackPromotionsCardProps) {
  const [tab, setTab] = useState<'reviews' | 'coupons'>('reviews')

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
      {/* Header with Tabs */}
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
            onClick={() => setTab('reviews')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 13,
              fontWeight: tab === 'reviews' ? 700 : 500,
              color: tab === 'reviews' ? 'var(--theme-text)' : 'var(--theme-elevation-500)',
              cursor: 'pointer',
              padding: '4px 6px',
              borderBottom: tab === 'reviews' ? '2px solid var(--theme-text)' : '2px solid transparent',
              marginBottom: -9,
            }}
          >
            Customer Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setTab('coupons')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 13,
              fontWeight: tab === 'coupons' ? 700 : 500,
              color: tab === 'coupons' ? 'var(--theme-text)' : 'var(--theme-elevation-500)',
              cursor: 'pointer',
              padding: '4px 6px',
              borderBottom: tab === 'coupons' ? '2px solid var(--theme-text)' : '2px solid transparent',
              marginBottom: -9,
            }}
          >
            Active Promotions ({coupons.length})
          </button>
        </div>

        <a
          href={tab === 'reviews' ? '/admin/collections/product-reviews' : '/admin/collections/coupons'}
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-text)', textDecoration: 'none' }}
        >
          {tab === 'reviews' ? 'All Reviews' : 'All Coupons'} &rarr;
        </a>
      </div>

      {/* Tab 1: Customer Reviews */}
      {tab === 'reviews' && (
        <>
          {reviews.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400)', fontSize: 13 }}>
              No recent customer reviews submitted.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {reviews.map((r) => {
                const isPending = r.status === 'pending'
                const isApproved = r.status === 'approved'

                return (
                  <a
                    key={r.id}
                    href={`/admin/collections/product-reviews/${r.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
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
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, color: 'var(--theme-warning-500, #d97706)', fontWeight: 700 }}>
                          {'★'.repeat(Math.max(1, Math.min(5, r.rating)))}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-text)' }}>
                          {r.authorName}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--theme-elevation-500)' }}>
                          on {r.productName}
                        </span>
                      </div>
                      {r.comment && (
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--theme-elevation-600, #555)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          &ldquo;{r.comment}&rdquo;
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: isPending
                            ? 'rgba(217, 119, 6, 0.12)'
                            : isApproved
                            ? 'rgba(22, 163, 74, 0.12)'
                            : 'rgba(220, 38, 38, 0.12)',
                          color: isPending
                            ? 'var(--theme-warning-500, #d97706)'
                            : isApproved
                            ? 'var(--theme-success-500, #16a34a)'
                            : 'var(--theme-error-500, #dc2626)',
                        }}
                      >
                        {r.status}
                      </span>
                      <div style={{ fontSize: 10, color: 'var(--theme-elevation-450, #888)', marginTop: 2 }}>
                        {formatDate(r.createdAt)}
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Active Coupons & Promotions */}
      {tab === 'coupons' && (
        <>
          {coupons.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400)', fontSize: 13 }}>
              No active coupons found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {coupons.map((c) => (
                <a
                  key={c.id}
                  href={`/admin/collections/coupons/${c.id}`}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          letterSpacing: '0.05em',
                          color: 'var(--theme-text)',
                          background: 'var(--theme-elevation-200)',
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {c.code}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--theme-text)' }}>
                        {c.type === 'percentage' ? `${c.value}% OFF` : `${currency === 'BDT' ? '৳' : '$'}${c.value} OFF`}
                      </span>
                    </div>
                    {c.minOrderValue > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--theme-elevation-500)', marginTop: 2 }}>
                        Min Order: {currency === 'BDT' ? '৳' : '$'}{c.minOrderValue}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--theme-text)' }}>
                      {c.totalUses} used
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--theme-elevation-450, #888)' }}>
                      {c.expiresAt ? `Exp: ${formatDate(c.expiresAt)}` : 'No Expiry'}
                    </div>
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
