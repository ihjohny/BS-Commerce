'use client'

import React, { useState } from 'react'
import type { RecentReview, ActiveCoupon } from '../../../../lib/admin-dashboard-stats'
import { AdminStatusBadge } from '../../ui'

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
        borderRadius: 'var(--bs-radius-lg, 12px)',
        border: '1px solid var(--theme-elevation-150, #e2e8f0)',
        background: 'var(--theme-elevation-0, var(--theme-bg, #ffffff))',
        padding: '1.25rem 1.4rem',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--bs-shadow-xs, 0 1px 2px 0 rgba(0, 0, 0, 0.03))',
      }}
    >
      {/* Header with Tabs */}
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
            onClick={() => setTab('reviews')}
            style={{
              borderRadius: 'var(--bs-radius-xs, 5px)',
              fontSize: 'var(--bs-font-sm, 0.8125rem)',
              fontWeight: tab === 'reviews' ? 600 : 500,
              color: tab === 'reviews' ? 'var(--theme-text, #0f172a)' : 'var(--theme-elevation-600, #64748b)',
              background: tab === 'reviews' ? 'var(--theme-elevation-0, #ffffff)' : 'transparent',
              border: 'none',
              boxShadow: tab === 'reviews' ? '0 1px 2px rgba(0, 0, 0, 0.06)' : 'none',
              cursor: 'pointer',
              padding: '4px 12px',
              transition: 'all 0.12s ease',
            }}
          >
            Reviews ({reviews.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('coupons')}
            style={{
              borderRadius: 'var(--bs-radius-xs, 5px)',
              fontSize: 'var(--bs-font-sm, 0.8125rem)',
              fontWeight: tab === 'coupons' ? 600 : 500,
              color: tab === 'coupons' ? 'var(--theme-text, #0f172a)' : 'var(--theme-elevation-600, #64748b)',
              background: tab === 'coupons' ? 'var(--theme-elevation-0, #ffffff)' : 'transparent',
              border: 'none',
              boxShadow: tab === 'coupons' ? '0 1px 2px rgba(0, 0, 0, 0.06)' : 'none',
              cursor: 'pointer',
              padding: '4px 12px',
              transition: 'all 0.12s ease',
            }}
          >
            Active Coupons ({coupons.length})
          </button>
        </div>

        <a
          href={tab === 'reviews' ? '/admin/collections/product-reviews' : '/admin/collections/coupons'}
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
          <span>{tab === 'reviews' ? 'All Reviews' : 'All Coupons'}</span>
          <span>&rarr;</span>
        </a>
      </div>

      {/* Tab 1: Customer Reviews */}
      {tab === 'reviews' && (
        <>
          {reviews.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400, #94a3b8)', fontSize: 'var(--bs-font-sm, 0.8125rem)' }}>
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
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', color: '#d97706', fontWeight: 700, letterSpacing: '0.05em' }}>
                          {'★'.repeat(Math.max(1, Math.min(5, r.rating)))}
                        </span>
                        <span style={{ fontSize: 'var(--bs-font-base, 0.875rem)', fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>
                          {r.authorName}
                        </span>
                        <span style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', color: 'var(--theme-elevation-500, #64748b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          on {r.productName}
                        </span>
                      </div>
                      {r.comment && (
                        <div
                          style={{
                            fontSize: 'var(--bs-font-sm, 0.8125rem)',
                            color: 'var(--theme-elevation-600, #475569)',
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
                      <AdminStatusBadge
                        status={r.status}
                        variant={isPending ? 'warning' : isApproved ? 'success' : 'error'}
                      />
                      <div style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', color: 'var(--theme-elevation-450, #64748b)', marginTop: 3 }}>
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
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--theme-elevation-400, #94a3b8)', fontSize: 'var(--bs-font-sm, 0.8125rem)' }}>
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
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 'var(--bs-font-xs, 0.75rem)',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          letterSpacing: '0.06em',
                          color: 'var(--bs-primary, #2563eb)',
                          background: 'var(--bs-primary-subtle, rgba(37, 99, 235, 0.08))',
                          border: '1px dashed var(--bs-primary-border, rgba(37, 99, 235, 0.3))',
                          padding: '2px 7px',
                          borderRadius: 4,
                        }}
                      >
                        {c.code}
                      </span>
                      <span style={{ fontSize: 'var(--bs-font-base, 0.875rem)', fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>
                        {c.type === 'percentage' ? `${c.value}% OFF` : `${currency === 'BDT' ? '৳' : '$'}${c.value} OFF`}
                      </span>
                    </div>
                    {c.minOrderValue > 0 && (
                      <div style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', color: 'var(--theme-elevation-500, #64748b)', marginTop: 2 }}>
                        Min Order: {currency === 'BDT' ? '৳' : '$'}{c.minOrderValue}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 'var(--bs-font-sm, 0.8125rem)', fontWeight: 700, color: 'var(--theme-text, #0f172a)', fontVariantNumeric: 'tabular-nums' }}>
                      {c.totalUses} used
                    </div>
                    <div style={{ fontSize: 'var(--bs-font-xs, 0.75rem)', color: 'var(--theme-elevation-500, #64748b)', marginTop: 2 }}>
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

