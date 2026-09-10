'use client'

import React, { useState } from 'react'
import { AdminCard } from '../../ui'

export type OrderFinancialsProps = {
  order: {
    subtotal: number
    shippingTotal: number
    taxTotal: number
    discountTotal: number
    grandTotal: number
    currency: string
    paymentStatus: string
    checkoutPaymentChannel?: string
    couponCodeSnapshot?: string
    appliedCoupon?: {
      id?: string
      code?: string
      description?: string
    } | string
    transaction?: {
      id?: string
      gateway?: string
      gatewayTransactionId?: string
      provider?: string
      providerTransactionId?: string
      type?: string
      status?: string
      amount?: number
      currency?: string
      paymentMethod?: string
      platformFee?: number
      createdAt?: string
      metadata?: Record<string, any>
    } | string
  }
  onEditFinancials?: () => void
}

function formatMoney(amount: number, currency: string) {
  const symbol = currency === 'BDT' ? '৳' : currency === 'USD' ? '$' : `${currency} `
  const num = Number(amount || 0)
  const hasDecimals = num % 1 !== 0
  return `${symbol}${num.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}

export function OrderFinancials({ order, onEditFinancials }: OrderFinancialsProps) {
  const [isPaymentOpen, setIsPaymentOpen] = useState(true)
  const txObj = typeof order.transaction === 'object' ? order.transaction : null
  const couponCode =
    order.couponCodeSnapshot ||
    (typeof order.appliedCoupon === 'object' ? order.appliedCoupon?.code : null)

  return (
    <AdminCard
      style={{ marginBottom: '1.25rem' }}
      title="Order Financials & Payment"
      icon={
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      }
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--theme-elevation-500, #64748b)',
            }}
          >
            Currency: {order.currency}
          </span>

          {onEditFinancials && (
            <button
              type="button"
              onClick={onEditFinancials}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--bs-primary, #2563eb)',
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              Edit Adjustments
            </button>
          )}
        </div>
      }
    >

      {/* Financial breakdown rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--theme-elevation-600, #475569)' }}>
          <span>Items Subtotal</span>
          <span style={{ fontWeight: 500, color: 'var(--theme-text, #0f172a)' }}>
            {formatMoney(order.subtotal, order.currency)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--theme-elevation-600, #475569)' }}>
          <span>Shipping & Handling</span>
          <span style={{ fontWeight: 500, color: 'var(--theme-text, #0f172a)' }}>
            {formatMoney(order.shippingTotal, order.currency)}
          </span>
        </div>

        {order.discountTotal > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: 'var(--bs-success, #16a34a)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>Discount</span>
              {couponCode && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'var(--bs-success-subtle, rgba(22, 163, 74, 0.12))',
                    border: '1px dashed var(--bs-success, #16a34a)',
                  }}
                >
                  {couponCode}
                </span>
              )}
            </span>
            <span style={{ fontWeight: 600 }}>
              -{formatMoney(order.discountTotal, order.currency)}
            </span>
          </div>
        )}

        {order.taxTotal > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--theme-elevation-600, #475569)' }}>
            <span>Estimated Tax</span>
            <span style={{ fontWeight: 500, color: 'var(--theme-text, #0f172a)' }}>
              {formatMoney(order.taxTotal, order.currency)}
            </span>
          </div>
        )}

        {/* Grand Total */}
        <div
          style={{
            borderTop: '2px solid var(--theme-elevation-150, #e2e8f0)',
            paddingTop: '0.85rem',
            marginTop: '0.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--theme-text, #0f172a)' }}>
            Grand Total
          </span>
          <span
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--theme-text, #0f172a)',
              letterSpacing: '-0.02em',
            }}
          >
            {formatMoney(order.grandTotal, order.currency)}
          </span>
        </div>
      </div>

      {/* Payment details box */}
      {(() => {
        const txId = txObj?.providerTransactionId || txObj?.gatewayTransactionId || txObj?.id
        const txStatus = txObj?.status
        const txType = txObj?.type
        const txAmount = txObj?.amount
        const txCurrency = txObj?.currency || order.currency
        const txDate = txObj?.createdAt
          ? new Date(txObj.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : null

        const hasPaymentDetails = Boolean(txId || txStatus || txType || txAmount != null || txDate)
        const paymentMethodLabel =
          order.checkoutPaymentChannel === 'cash_on_delivery'
            ? 'Cash on Delivery (COD)'
            : (txObj?.provider || txObj?.gateway || 'Online Gateway').toUpperCase()

        return (
          <div
            style={{
              marginTop: '1.25rem',
              background: 'var(--theme-elevation-50, #f8fafc)',
              borderRadius: 8,
              border: '1px solid var(--theme-elevation-150, #e2e8f0)',
              overflow: 'hidden',
            }}
          >
            {hasPaymentDetails ? (
              <button
                type="button"
                onClick={() => setIsPaymentOpen(!isPaymentOpen)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--theme-elevation-600, #64748b)', fontWeight: 500, fontSize: 12 }}>
                    Payment Method:
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--theme-text, #0f172a)', fontSize: 13 }}>
                    {paymentMethodLabel}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {txObj?.status && !isPaymentOpen && (
                    <span
                      style={{
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background:
                          txObj.status === 'succeeded' || txObj.status === 'success' || txObj.status === 'paid'
                            ? 'var(--bs-success-subtle, rgba(22, 163, 74, 0.12))'
                            : 'var(--theme-elevation-150, #e2e8f0)',
                        color:
                          txObj.status === 'succeeded' || txObj.status === 'success' || txObj.status === 'paid'
                            ? 'var(--bs-success, #16a34a)'
                            : 'var(--theme-elevation-700, #334155)',
                      }}
                    >
                      {txObj.status}
                    </span>
                  )}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--theme-elevation-500, #64748b)"
                    strokeWidth="2"
                    style={{
                      transform: isPaymentOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </button>
            ) : (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ color: 'var(--theme-elevation-600, #64748b)', fontWeight: 500, fontSize: 12 }}>
                  Payment Method:
                </span>
                <span style={{ fontWeight: 600, color: 'var(--theme-text, #0f172a)', fontSize: 13 }}>
                  {paymentMethodLabel}
                </span>
              </div>
            )}

            {/* Collapsible content (only shown when details exist and isOpen is true) */}
            {hasPaymentDetails && isPaymentOpen && (
              <div
                style={{
                  padding: '0 1rem 0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  fontSize: 12,
                  borderTop: '1px solid var(--theme-elevation-150, #e2e8f0)',
                  paddingTop: '0.75rem',
                }}
              >
                {txId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--theme-elevation-600, #64748b)' }}>Transaction ID:</span>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        color: 'var(--theme-text, #0f172a)',
                        wordBreak: 'break-all',
                      }}
                    >
                      {txId}
                    </span>
                  </div>
                )}

                {txType && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--theme-elevation-600, #64748b)' }}>Transaction Type:</span>
                    <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>
                      {txType}
                    </span>
                  </div>
                )}

                {txAmount != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--theme-elevation-600, #64748b)' }}>Captured Amount:</span>
                    <span style={{ fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>
                      {formatMoney(txAmount, txCurrency)}
                    </span>
                  </div>
                )}

                {txStatus && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--theme-elevation-600, #64748b)' }}>Gateway Status:</span>
                    <span
                      style={{
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background:
                          txStatus === 'succeeded' || txStatus === 'success' || txStatus === 'paid'
                            ? 'var(--bs-success-subtle, rgba(22, 163, 74, 0.12))'
                            : txStatus === 'pending' || txStatus === 'processing'
                            ? 'var(--bs-warning-subtle, rgba(217, 119, 6, 0.12))'
                            : 'var(--bs-error-subtle, rgba(220, 38, 38, 0.12))',
                        color:
                          txStatus === 'succeeded' || txStatus === 'success' || txStatus === 'paid'
                            ? 'var(--bs-success, #16a34a)'
                            : txStatus === 'pending' || txStatus === 'processing'
                            ? 'var(--bs-warning, #d97706)'
                            : 'var(--bs-error, #dc2626)',
                      }}
                    >
                      {txStatus}
                    </span>
                  </div>
                )}

                {txDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--theme-elevation-600, #64748b)' }}>Transaction Date:</span>
                    <span style={{ fontSize: 11, color: 'var(--theme-elevation-600, #64748b)' }}>
                      {txDate}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}
    </AdminCard>
  )
}
