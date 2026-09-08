'use client'

import React, { useState } from 'react'
import type { RecentReview, ActiveCoupon } from '../../../../lib/admin-dashboard-stats'

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
        borderRadius: 'var(--bs-radius-md, 8px)',
        border: '1px solid var(--theme-elevation-150)',
        background: 'var(--theme-elevation-50)',
        padding: '1.25rem 1.4rem',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--bs-shadow-xs)',
      }}
    >
      {/* Header with Tabs */}
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
            borderRadius: 'var(--bs-radius-sm, 6px)',
            background: 'var(--theme-elevation-100)',
            border: '1px solid var(--theme-elevation-200)',
            gap: 1,
          }}
        >
          <button
            onClick={() => setTab('reviews')}
            style={{
              borderRadius: 4,
              fontSize: 12,
              fontWeight: tab === 'reviews' ? 600 : 500,
              color: tab === 'reviews' ? 'var(--theme-text)' : 'var(--theme-elevation-600)',
              background: tab === 'reviews' ? 'var(--theme-elevation-0, var(--theme-bg))' : 'transparent',
              border: tab === 'reviews' ? '1px solid var(--theme-elevation-200)' : '1px solid transparent',
              boxShadow: tab === 'reviews' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
              cursor: 'pointer',
              padding: '3px 9px',
              transition: 'all 0.12s ease',
            }}
          >
            Customer Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setTab('coupons')}
            style={{
              borderRadius: 4,
              fontSize: 12,
              fontWeight: tab === 'coupons' ? 600 : 500,
              color: tab === 'coupons' ? 'var(--theme-text)' : 'var(--theme-elevation-600)',
              background: tab === 'coupons' ? 'var(--theme-elevation-0, var(--theme-bg))' : 'transparent',
              border: tab === 'coupons' ? '1px solid var(--theme-elevation-200)' : '1px solid transparent',
              boxShadow: tab === 'coupons' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
              cursor: 'pointer',
              padding: '3px 9px',
              transition: 'all 0.12s ease',
            }}
          >
            Active Promotions ({coupons.length})
          </button>
        </div>

        <a
          href={tab === 'reviews' ? '/admin/collections/product-reviews' : '/admin/collections/coupons'}
          style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--bs-primary, #2563eb)', textDecoration: 'none' }}
        >
          {tab === 'reviews' ? 'All Reviews' : 'All Coupons'} &rarr;
        </a>
      </div>

      {/* Tab 1: Customer Reviews */}
      {tab === 'reviews' && (
        <>
          {reviews.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400)', fontSize: 13 }}>
              No recent customer reviews submitted.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, letterSpacing: '0.05em' }}>
                          {'★'.repeat(Math.max(1, Math.min(5, r.rating)))}
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--theme-text)' }}>
                          {r.authorName}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--theme-elevation-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          on {r.productName}
                        </span>
                      </div>
                      {r.comment && (
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--theme-elevation-600)',
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
                          padding: '2px 7px',
                          borderRadius: 999,
                          letterSpacing: '0.04em',
                          background: isPending
                            ? 'var(--bs-warning-subtle)'
                            : isApproved
                            ? 'var(--bs-success-subtle)'
                            : 'var(--bs-error-subtle)',
                          color: isPending
                            ? 'var(--bs-warning, #d97706)'
                            : isApproved
                            ? 'var(--bs-success, #16a34a)'
                            : 'var(--bs-error, #dc2626)',
                        }}
                      >
                        {r.status}
                      </span>
                      <div style={{ fontSize: 10.5, color: 'var(--theme-elevation-500)', marginTop: 3 }}>
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
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400)', fontSize: 13 }}>
              No active coupons found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          letterSpacing: '0.06em',
                          color: 'var(--bs-primary, #2563eb)',
                          background: 'var(--bs-primary-subtle)',
                          border: '1px dashed var(--bs-primary-border)',
                          padding: '2px 7px',
                          borderRadius: 4,
                        }}
                      >
                        {c.code}
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--theme-text)' }}>
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
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--theme-text)', fontVariantNumeric: 'tabular-nums' }}>
                      {c.totalUses} used
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--theme-elevation-500)', marginTop: 2 }}>
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
