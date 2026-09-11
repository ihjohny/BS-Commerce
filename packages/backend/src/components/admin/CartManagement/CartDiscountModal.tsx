'use client'

import React, { useState, useEffect } from 'react'

export type CartDiscountModalProps = {
  isOpen: boolean
  onClose: () => void
  cartId: string
  subtotal: number
  currency?: string
  currentCouponCode?: string | null
  currentFlatDiscount?: number | null
  currentFlatDiscountReason?: string | null
  customerId?: string | number
  onSuccess: (updatedCart: any, message: string) => void
}

function formatMoney(amount: number, currency: string = 'BDT') {
  const symbol = currency === 'BDT' ? '৳' : currency === 'USD' ? '$' : `${currency} `
  const num = Number(amount || 0)
  const hasDecimals = num % 1 !== 0
  return `${symbol}${num.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}

export function CartDiscountModal({
  isOpen,
  onClose,
  cartId,
  subtotal,
  currency = 'BDT',
  currentCouponCode,
  currentFlatDiscount = 0,
  currentFlatDiscountReason = '',
  customerId,
  onSuccess,
}: CartDiscountModalProps) {
  // Coupon state
  const [couponCodeSnapshot, setCouponCodeSnapshot] = useState<string | null>(currentCouponCode || null)
  const [couponDiscount, setCouponDiscount] = useState<number>(0)
  const [couponInput, setCouponInput] = useState('')
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([])
  const [loadingCoupons, setLoadingCoupons] = useState(false)
  const [couponFeedback, setCouponFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // Flat discount state
  const [flatDiscount, setFlatDiscount] = useState<number>(currentFlatDiscount || 0)
  const [flatDiscountReason, setFlatDiscountReason] = useState<string>(currentFlatDiscountReason || '')

  const [saving, setSaving] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)

  // Reset & load on open
  useEffect(() => {
    if (!isOpen) return
    setGeneralError(null)
    setCouponFeedback(null)
    setCouponInput('')
    setCouponCodeSnapshot(currentCouponCode || null)
    setFlatDiscount(Number(currentFlatDiscount) || 0)
    setFlatDiscountReason(currentFlatDiscountReason || '')

    let isMounted = true

    // Fetch active coupons to offer campaign options and compute current coupon discount
    async function initData() {
      setLoadingCoupons(true)
      try {
        const res = await fetch('/api/coupons?where[isActive][equals]=true&limit=50&depth=0', {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          if (isMounted && Array.isArray(data.docs)) {
            setAvailableCoupons(data.docs)

            // If currentCouponCode is active, calculate its discount value
            if (currentCouponCode) {
              const matched = data.docs.find((c: any) => c.code === currentCouponCode.trim().toUpperCase())
              if (matched) {
                let disc = 0
                if (matched.type === 'percentage') {
                  disc = (subtotal * Number(matched.value || 0)) / 100
                } else {
                  disc = Number(matched.value || 0)
                }
                disc = Math.round(Math.max(0, Math.min(disc, subtotal)) * 100) / 100
                setCouponDiscount(disc)
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load active coupons:', err)
      } finally {
        if (isMounted) setLoadingCoupons(false)
      }
    }

    initData()

    return () => {
      isMounted = false
    }
  }, [isOpen, currentCouponCode, currentFlatDiscount, currentFlatDiscountReason, subtotal])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Calculate live totals
  const totalDiscount = Math.min(subtotal, Math.round(((couponDiscount || 0) + (Number(flatDiscount) || 0)) * 100) / 100)
  const calculatedGrandTotal = Math.max(0, Math.round((subtotal - totalDiscount) * 100) / 100)

  // Validate coupon directly via Payload API (exact match with EditFinancialsModal)
  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponInput).trim().toUpperCase()
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
          message: `Cart subtotal (${formatMoney(subtotal, currency)}) is below minimum requirement (${formatMoney(minOrder, currency)}).`,
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

      setCouponDiscount(calcDiscount)
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
    setCouponDiscount(0)
    setCouponCodeSnapshot(null)
    setCouponFeedback(null)
    setCouponInput('')
  }

  // Save changes to backend cart
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setGeneralError(null)

    try {
      const patchBody: Record<string, any> = {
        couponCode: couponCodeSnapshot || '',
        flatDiscount: Number(flatDiscount) || 0,
        flatDiscountReason: flatDiscountReason.trim() ? flatDiscountReason.trim() : null,
      }

      const res = await fetch(`/api/carts/${cartId}?depth=2`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patchBody),
      })

      const data = await res.json()
      if (!res.ok) {
        const msg = data.errors?.[0]?.message || data.error || 'Failed to update cart discounts.'
        setGeneralError(msg)
        return
      }

      onSuccess(data.doc, 'Cart discounts updated successfully!')
      onClose()
    } catch (err: any) {
      setGeneralError(err?.message || 'Failed to update cart discounts.')
    } finally {
      setSaving(false)
    }
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
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose()
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
        onClick={(e) => e.stopPropagation()}
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
            Edit Cart Discounts & Coupon
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 18,
              cursor: saving ? 'not-allowed' : 'pointer',
              color: 'var(--theme-elevation-500, #64748b)',
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {/* General Error Banner */}
          {generalError && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                background: 'var(--bs-error-subtle, rgba(220, 38, 38, 0.12))',
                border: '1px solid var(--bs-error, #dc2626)',
                color: 'var(--bs-error, #dc2626)',
              }}
            >
              {generalError}
            </div>
          )}

          {/* Section 1: Discount & Coupon Card (Exact match with EditFinancialsModal) */}
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
                    Discount applied: -{formatMoney(couponDiscount, currency)}
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
              <>
                {/* Optional Quick Campaign Dropdown */}
                {availableCoupons.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <select
                      disabled={validatingCoupon || loadingCoupons}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val) handleApplyCoupon(val)
                      }}
                      defaultValue=""
                      style={{ ...inputStyle, fontSize: 12, marginBottom: 4 }}
                    >
                      <option value="">-- Or choose from active promotional campaigns --</option>
                      {availableCoupons.map((c) => (
                        <option key={c.id} value={c.code}>
                          {c.code} — {c.type === 'percentage' ? `${c.value}% Off` : `${formatMoney(c.value, currency)} Off`}
                          {c.minOrderValue ? ` (Min subtotal: ${formatMoney(c.minOrderValue, currency)})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Coupon Input Row */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="Enter coupon code (e.g. TECHFEST)"
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
                    onClick={() => handleApplyCoupon()}
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
              </>
            )}

            {/* Manual / Flat Discount Section */}
            <div style={{ marginTop: 10 }}>
              <label style={{ ...labelStyle, fontSize: 11 }}>
                Or Custom Flat / Courtesy Discount Amount ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={flatDiscount === 0 ? '' : flatDiscount}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0
                  setFlatDiscount(Math.min(val, subtotal))
                }}
                placeholder="0.00"
                style={{ ...inputStyle, padding: '6px 10px' }}
              />
            </div>

            {/* Flat Discount Reason Note */}
            <div style={{ marginTop: 8 }}>
              <label style={{ ...labelStyle, fontSize: 11 }}>Administrative Reason / Memo Note (Optional)</label>
              <input
                type="text"
                value={flatDiscountReason}
                onChange={(e) => setFlatDiscountReason(e.target.value)}
                placeholder="e.g. Customer courtesy, manager approved, price match"
                style={{ ...inputStyle, padding: '6px 10px' }}
              />

              {/* Quick Suggestion Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {['Customer Courtesy', 'Management Concession', 'VIP Promo', 'Support Resolution'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFlatDiscountReason(preset)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1px solid var(--theme-elevation-200, #cbd5e1)',
                      background: 'var(--theme-elevation-0, #ffffff)',
                      color: 'var(--theme-elevation-600, #475569)',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Coupon feedback banner */}
            {couponFeedback && (
              <div
                style={{
                  marginTop: 10,
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

          {/* Section 2: Real-time Calculation Summary (Exact match with EditFinancialsModal) */}
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

            {couponCodeSnapshot && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--bs-success, #16a34a)' }}>
                <span>Coupon Discount ({couponCodeSnapshot}):</span>
                <span style={{ fontWeight: 600 }}>-{formatMoney(couponDiscount, currency)}</span>
              </div>
            )}

            {flatDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--bs-success, #16a34a)' }}>
                <span>Flat / Courtesy Discount ({flatDiscountReason || 'Manual'}):</span>
                <span style={{ fontWeight: 600 }}>-{formatMoney(flatDiscount, currency)}</span>
              </div>
            )}

            {couponCodeSnapshot && flatDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--bs-success, #16a34a)', fontStyle: 'italic', fontSize: 12 }}>
                <span>Total Savings:</span>
                <span style={{ fontWeight: 700 }}>-{formatMoney(totalDiscount, currency)}</span>
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

          {/* Modal Actions (Exact match with EditFinancialsModal) */}
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
                cursor: saving ? 'not-allowed' : 'pointer',
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
