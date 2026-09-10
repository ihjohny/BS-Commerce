'use client'

import React, { useState } from 'react'

export type EditFinancialsModalProps = {
  isOpen: boolean
  currency: string
  subtotal: number
  initialDiscountTotal: number
  initialCouponCode?: string | null
  initialAppliedCouponId?: string | null
  initialShippingTotal: number
  initialTaxTotal: number
  customerId?: string | number
  onClose: () => void
  onSave: (data: {
    shippingTotal: number
    taxTotal: number
    discountTotal: number
    appliedCoupon?: string | null
    couponCodeSnapshot?: string | null
    grandTotal: number
  }) => Promise<void>
  saving: boolean
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

export function EditFinancialsModal({
  isOpen,
  currency,
  subtotal,
  initialDiscountTotal,
  initialCouponCode,
  initialAppliedCouponId,
  initialShippingTotal,
  initialTaxTotal,
  customerId,
  onClose,
  onSave,
  saving,
}: EditFinancialsModalProps) {
  const [shippingTotal, setShippingTotal] = useState<number>(initialShippingTotal || 0)
  const [taxTotal, setTaxTotal] = useState<number>(initialTaxTotal || 0)
  const [discountTotal, setDiscountTotal] = useState<number>(initialDiscountTotal || 0)
  const [appliedCouponId, setAppliedCouponId] = useState<string | null>(initialAppliedCouponId || null)
  const [couponCodeSnapshot, setCouponCodeSnapshot] = useState<string | null>(initialCouponCode || null)

  // Coupon lookup state
  const [couponInput, setCouponInput] = useState('')
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [couponFeedback, setCouponFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  if (!isOpen) return null

  // Calculate live Grand Total
  const calculatedGrandTotal = Math.max(
    0,
    Number(subtotal || 0) + Number(shippingTotal || 0) + Number(taxTotal || 0) - Number(discountTotal || 0)
  )

  // Validate coupon directly via Payload API
  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) {
      setCouponFeedback({ type: 'error', message: 'Please enter a coupon code.' })
      return
    }

    setValidatingCoupon(true)
    setCouponFeedback(null)

    try {
      const res = await fetch(`/api/coupons?where[code][equals]=${encodeURIComponent(code)}&depth=0&limit=1`, {
        credentials: 'include',
      })
      if (!res.ok) {
        setCouponFeedback({ type: 'error', message: 'Failed to search for coupon.' })
        return
      }

      const data = await res.json()
      const coupon = data.docs?.[0]
      if (!coupon) {
        setCouponFeedback({ type: 'error', message: `Coupon "${code}" not found.` })
        return
      }

      if (coupon.isActive === false) {
        setCouponFeedback({ type: 'error', message: `Coupon "${code}" is inactive.` })
        return
      }

      if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
        setCouponFeedback({ type: 'error', message: `Coupon "${code}" has expired.` })
        return
      }

      const minOrder = Number(coupon.minOrderValue || 0)
      if (subtotal < minOrder) {
        setCouponFeedback({
          type: 'error',
          message: `Order subtotal (${formatMoney(subtotal, currency)}) is below minimum requirement (${formatMoney(minOrder, currency)}).`,
        })
        return
      }

      const totalUses = Number(coupon.totalUses || 0)
      if (coupon.maxTotalUses != null && totalUses >= Number(coupon.maxTotalUses)) {
        setCouponFeedback({ type: 'error', message: `Coupon "${code}" usage limit has been reached.` })
        return
      }

      // Check maxUsesPerUser if customer exists
      if (coupon.maxUsesPerUser != null && customerId != null) {
        const checkRes = await fetch(
          `/api/orders?where[and][0][customer][equals]=${customerId}&where[and][1][appliedCoupon][equals]=${coupon.id}&limit=0`,
          { credentials: 'include' }
        )
        if (checkRes.ok) {
          const checkData = await checkRes.json()
          if (checkData.totalDocs >= Number(coupon.maxUsesPerUser)) {
            setCouponFeedback({
              type: 'error',
              message: `Customer has already reached the maximum usage (${coupon.maxUsesPerUser}) for this coupon.`,
            })
            return
          }
        }
      }

      // Calculate discount
      let calcDiscount = 0
      if (coupon.type === 'percentage') {
        calcDiscount = (subtotal * Number(coupon.value || 0)) / 100
      } else {
        calcDiscount = Number(coupon.value || 0)
      }
      calcDiscount = Math.round(Math.max(0, Math.min(calcDiscount, subtotal)) * 100) / 100

      setDiscountTotal(calcDiscount)
      setAppliedCouponId(coupon.id)
      setCouponCodeSnapshot(coupon.code)
      setCouponInput('')
      setCouponFeedback({
        type: 'success',
        message: `Applied "${coupon.code}" successfully! Discount: ${formatMoney(calcDiscount, currency)}`,
      })
    } catch {
      setCouponFeedback({ type: 'error', message: 'Network error validating coupon.' })
    } finally {
      setValidatingCoupon(false)
    }
  }

  // Remove applied coupon
  const handleRemoveCoupon = () => {
    setDiscountTotal(0)
    setAppliedCouponId(null)
    setCouponCodeSnapshot(null)
    setCouponFeedback(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      shippingTotal: Number(shippingTotal) || 0,
      taxTotal: Number(taxTotal) || 0,
      discountTotal: Number(discountTotal) || 0,
      appliedCoupon: appliedCouponId,
      couponCodeSnapshot: couponCodeSnapshot,
      grandTotal: calculatedGrandTotal,
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--theme-elevation-200, #cbd5e1)',
    background: 'var(--theme-elevation-0, #ffffff)',
    color: 'var(--theme-text, #0f172a)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--theme-elevation-700, #334155)',
    marginBottom: 4,
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'var(--theme-elevation-0, #ffffff)',
          borderRadius: 12,
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--theme-elevation-200, #cbd5e1)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'var(--theme-elevation-0, #ffffff)',
            zIndex: 10,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--theme-text, #0f172a)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Edit Financial Adjustments & Discount
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 18,
              cursor: 'pointer',
              color: 'var(--theme-elevation-500, #64748b)',
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {/* Shipping and Tax */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={labelStyle}>Shipping & Handling ({currency})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={shippingTotal}
                onChange={(e) => setShippingTotal(Number(e.target.value))}
                style={inputStyle}
                autoFocus
              />
            </div>

            <div>
              <label style={labelStyle}>Estimated Tax ({currency})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={taxTotal}
                onChange={(e) => setTaxTotal(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Discount & Coupon Section */}
          <div
            style={{
              border: '1px solid var(--theme-elevation-200, #cbd5e1)',
              borderRadius: 10,
              padding: '1rem',
              marginBottom: '1.25rem',
              background: 'var(--theme-elevation-50, #f8fafc)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-text, #0f172a)' }}>
                Apply Valid Discount Coupon
              </span>
              {couponCodeSnapshot && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: 'var(--bs-success-subtle, rgba(22, 163, 74, 0.12))',
                    border: '1px solid var(--bs-success, #16a34a)',
                    color: 'var(--bs-success, #16a34a)',
                  }}
                >
                  Active: {couponCodeSnapshot}
                </span>
              )}
            </div>

            {/* Current Applied Coupon Banner */}
            {couponCodeSnapshot ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: 'var(--theme-elevation-0, #ffffff)',
                  border: '1px solid var(--bs-success, #16a34a)',
                  marginBottom: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>
                    {couponCodeSnapshot}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--bs-success, #16a34a)', fontWeight: 500 }}>
                    Discount applied: -{formatMoney(discountTotal, currency)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--bs-error, #dc2626)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 8px',
                  }}
                >
                  Remove Coupon
                </button>
              </div>
            ) : (
              /* Coupon Input Row */
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="Enter coupon code (e.g. SAVE20)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleApplyCoupon()
                    }
                  }}
                  style={{ ...inputStyle, textTransform: 'uppercase' }}
                />
                <button
                  type="button"
                  disabled={validatingCoupon || !couponInput.trim()}
                  onClick={handleApplyCoupon}
                  style={{
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--bs-primary, #2563eb)',
                    color: '#ffffff',
                    cursor: validatingCoupon || !couponInput.trim() ? 'not-allowed' : 'pointer',
                    opacity: validatingCoupon || !couponInput.trim() ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {validatingCoupon ? 'Validating...' : 'Apply Coupon'}
                </button>
              </div>
            )}

            {/* Manual Discount Override */}
            <div style={{ marginTop: 8 }}>
              <label style={{ ...labelStyle, fontSize: 11 }}>Or Custom Discount Amount ({currency})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountTotal}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0
                  setDiscountTotal(Math.min(val, subtotal))
                  if (val === 0) {
                    setAppliedCouponId(null)
                    setCouponCodeSnapshot(null)
                  }
                }}
                style={{ ...inputStyle, padding: '6px 10px' }}
              />
            </div>

            {/* Coupon feedback banner */}
            {couponFeedback && (
              <div
                style={{
                  marginTop: 8,
                  padding: '6px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  background:
                    couponFeedback.type === 'success'
                      ? 'var(--bs-success-subtle, rgba(22, 163, 74, 0.12))'
                      : 'var(--bs-error-subtle, rgba(220, 38, 38, 0.12))',
                  border:
                    couponFeedback.type === 'success'
                      ? '1px solid var(--bs-success, #16a34a)'
                      : '1px solid var(--bs-error, #dc2626)',
                  color:
                    couponFeedback.type === 'success'
                      ? 'var(--bs-success, #16a34a)'
                      : 'var(--bs-error, #dc2626)',
                }}
              >
                {couponFeedback.message}
              </div>
            )}
          </div>

          {/* Real-time Calculation Summary */}
          <div
            style={{
              background: 'var(--theme-elevation-50, #f8fafc)',
              border: '1px solid var(--theme-elevation-150, #e2e8f0)',
              borderRadius: 8,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              fontSize: 13,
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--theme-elevation-600, #475569)' }}>
              <span>Items Subtotal:</span>
              <span style={{ fontWeight: 500 }}>{formatMoney(subtotal, currency)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--theme-elevation-600, #475569)' }}>
              <span>Adjusted Shipping:</span>
              <span style={{ fontWeight: 500 }}>{formatMoney(Number(shippingTotal) || 0, currency)}</span>
            </div>

            {discountTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--bs-success, #16a34a)' }}>
                <span>Discount ({couponCodeSnapshot || 'Manual'}):</span>
                <span style={{ fontWeight: 600 }}>-{formatMoney(discountTotal, currency)}</span>
              </div>
            )}

            {taxTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--theme-elevation-600, #475569)' }}>
                <span>Adjusted Tax:</span>
                <span style={{ fontWeight: 500 }}>{formatMoney(Number(taxTotal) || 0, currency)}</span>
              </div>
            )}

            <div
              style={{
                borderTop: '1px solid var(--theme-elevation-200, #cbd5e1)',
                paddingTop: 8,
                marginTop: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <span style={{ fontWeight: 700, color: 'var(--theme-text, #0f172a)' }}>Preview Grand Total:</span>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--theme-text, #0f172a)' }}>
                {formatMoney(calculatedGrandTotal, currency)}
              </span>
            </div>
          </div>

          {/* Modal Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              paddingTop: '1rem',
              borderTop: '1px solid var(--theme-elevation-150, #e2e8f0)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                border: '1px solid var(--theme-elevation-200, #cbd5e1)',
                background: 'transparent',
                color: 'var(--theme-text, #0f172a)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                border: 'none',
                background: 'var(--bs-primary, #2563eb)',
                color: '#ffffff',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save Adjustments'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
