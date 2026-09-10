'use client'

import React, { useEffect, useState } from 'react'

export type ProductStockModalProps = {
  isOpen: boolean
  productId?: string | null
  productName: string
  variantId?: string | null
  variantName?: string | null
  sku?: string | null
  productImage?: string | null
  onClose: () => void
}

type StockLevelDoc = {
  id: string
  location?: {
    id?: string
    name?: string
    type?: string
    address?: {
      city?: string
      state?: string
    }
    isPublicStore?: boolean
  } | string
  quantity: number
  reservedQuantity?: number
  updatedAt?: string
}

export function ProductStockModal({
  isOpen,
  productId,
  productName,
  variantId,
  variantName,
  sku,
  productImage,
  onClose,
}: ProductStockModalProps) {
  const [stockLevels, setStockLevels] = useState<StockLevelDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !productId) return

    let isMounted = true
    setLoading(true)
    setError(null)

    const fetchStock = async () => {
      try {
        let url = `/api/stock-levels?where[product][equals]=${productId}&depth=2&limit=50`
        if (variantId) {
          url += `&where[variant][equals]=${variantId}`
        }

        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) {
          throw new Error('Failed to load stock levels')
        }
        const data = await res.json()
        if (isMounted) {
          setStockLevels(data.docs || [])
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Error loading stock information')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchStock()

    return () => {
      isMounted = false
    }
  }, [isOpen, productId, variantId])

  if (!isOpen) return null

  // Calculate totals
  const totalPhysical = stockLevels.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  const totalReserved = stockLevels.reduce((sum, item) => sum + (Number(item.reservedQuantity) || 0), 0)
  const totalAvailable = Math.max(0, totalPhysical - totalReserved)

  const isLowStock = totalAvailable > 0 && totalAvailable <= 5
  const isOutOfStock = totalAvailable <= 0

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
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: 'var(--theme-elevation-0, #ffffff)',
          borderRadius: 12,
          width: '100%',
          maxWidth: 620,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--theme-elevation-200, #cbd5e1)',
          overflow: 'hidden',
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'var(--bs-primary-subtle, rgba(37, 99, 235, 0.1))',
                color: 'var(--bs-primary, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--theme-text, #0f172a)' }}>
                Product Inventory & Stock Info
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--theme-elevation-500, #64748b)' }}>
                Real-time warehouse availability breakdown
              </p>
            </div>
          </div>
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

        {/* Product Identity Summary */}
        <div
          style={{
            padding: '1rem 1.5rem',
            background: 'var(--theme-elevation-50, #f8fafc)',
            borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          {productImage ? (
            <img
              src={productImage}
              alt={productName}
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                objectFit: 'cover',
                border: '1px solid var(--theme-elevation-200, #cbd5e1)',
                background: '#ffffff',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                background: 'var(--theme-elevation-100, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'var(--theme-elevation-400, #94a3b8)',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--theme-text, #0f172a)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {productName}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
              {variantName && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--bs-primary, #2563eb)',
                    background: 'var(--bs-primary-subtle, rgba(37, 99, 235, 0.08))',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  Variant: {variantName}
                </span>
              )}
              {sku && sku !== '-' && (
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'monospace',
                    color: 'var(--theme-elevation-600, #475569)',
                  }}
                >
                  SKU: {sku}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: '1.5rem' }}>
          {/* Quick Metrics Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: '1.25rem',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                background: 'var(--theme-elevation-50, #f8fafc)',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--theme-elevation-500, #64748b)', fontWeight: 600 }}>
                Available to Sell
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: isOutOfStock
                    ? 'var(--bs-error, #dc2626)'
                    : isLowStock
                    ? 'var(--bs-warning, #d97706)'
                    : 'var(--bs-success, #16a34a)',
                  marginTop: 2,
                }}
              >
                {loading ? '...' : totalAvailable}
              </div>
            </div>

            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                background: 'var(--theme-elevation-50, #f8fafc)',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--theme-elevation-500, #64748b)', fontWeight: 600 }}>
                Reserved (Orders)
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--theme-text, #0f172a)', marginTop: 2 }}>
                {loading ? '...' : totalReserved}
              </div>
            </div>

            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                background: 'var(--theme-elevation-50, #f8fafc)',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--theme-elevation-500, #64748b)', fontWeight: 600 }}>
                Total On Hand
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--theme-text, #0f172a)', marginTop: 2 }}>
                {loading ? '...' : totalPhysical}
              </div>
            </div>
          </div>

          {/* Warehouse Breakdown Table */}
          <div style={{ marginBottom: '1rem' }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--theme-elevation-700, #334155)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 8,
              }}
            >
              Warehouse Locations
            </div>

            {loading ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--theme-elevation-500, #64748b)',
                  fontSize: 13,
                  background: 'var(--theme-elevation-50, #f8fafc)',
                  borderRadius: 8,
                }}
              >
                Loading inventory across warehouses...
              </div>
            ) : error ? (
              <div
                style={{
                  padding: '1rem',
                  background: 'var(--bs-error-subtle, rgba(220, 38, 38, 0.08))',
                  border: '1px solid var(--bs-error, #dc2626)',
                  color: 'var(--bs-error, #dc2626)',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            ) : stockLevels.length === 0 ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--theme-elevation-500, #64748b)',
                  fontSize: 13,
                  background: 'var(--theme-elevation-50, #f8fafc)',
                  borderRadius: 8,
                  border: '1px dashed var(--theme-elevation-200, #cbd5e1)',
                }}
              >
                No stock level records found for this product/variant.
              </div>
            ) : (
              <div
                style={{
                  border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr
                      style={{
                        background: 'var(--theme-elevation-50, #f8fafc)',
                        borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
                        color: 'var(--theme-elevation-600, #475569)',
                        fontWeight: 600,
                        textAlign: 'left',
                      }}
                    >
                      <th style={{ padding: '8px 12px' }}>Warehouse / Location</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>On Hand</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Reserved</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockLevels.map((sl, idx) => {
                      const locName =
                        typeof sl.location === 'object' && sl.location !== null
                          ? sl.location.name || 'Warehouse'
                          : typeof sl.location === 'string'
                          ? `Location #${sl.location}`
                          : 'Main Warehouse'

                      const locType = typeof sl.location === 'object' && sl.location !== null ? sl.location.type : null
                      const onHand = Number(sl.quantity) || 0
                      const reserved = Number(sl.reservedQuantity) || 0
                      const available = Math.max(0, onHand - reserved)

                      return (
                        <tr
                          key={sl.id || idx}
                          style={{
                            borderBottom:
                              idx === stockLevels.length - 1
                                ? 'none'
                                : '1px solid var(--theme-elevation-100, #f1f5f9)',
                          }}
                        >
                          <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>{locName}</div>
                            {locType && (
                              <span
                                style={{
                                  fontSize: 11,
                                  color: 'var(--theme-elevation-500, #64748b)',
                                  textTransform: 'capitalize',
                                }}
                              >
                                {locType}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{onHand}</td>
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              color: 'var(--theme-elevation-600, #475569)',
                            }}
                          >
                            {reserved}
                          </td>
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              fontWeight: 700,
                              color:
                                available <= 0
                                  ? 'var(--bs-error, #dc2626)'
                                  : available <= 5
                                  ? 'var(--bs-warning, #d97706)'
                                  : 'var(--bs-success, #16a34a)',
                            }}
                          >
                            {available}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              paddingTop: '1rem',
              borderTop: '1px solid var(--theme-elevation-150, #e2e8f0)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                border: '1px solid var(--theme-elevation-200, #cbd5e1)',
                background: 'var(--theme-elevation-50, #f8fafc)',
                color: 'var(--theme-text, #0f172a)',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
