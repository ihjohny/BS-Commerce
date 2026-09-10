'use client'

import React, { useState } from 'react'
import { ProductStockModal } from './modals/ProductStockModal'

export type OrderItemData = {
  id: string
  productName?: string
  productTitle?: string
  productSlug?: string
  variantName?: string
  sku?: string
  quantity: number
  unitPrice?: number
  totalPrice?: number
  price?: number
  subtotal?: number
  tax?: number
  total?: number
  currency?: string
  productImage?: string
  product?: {
    id?: string
    title?: string
    slug?: string
    images?: Array<{
      image?: {
        url?: string
        alt?: string
        sizes?: {
          thumbnail?: { url?: string }
          card?: { url?: string }
        }
      } | string
    }>
  } | string
  variant?: {
    id?: string
    title?: string
    sku?: string
    options?: Array<{ attribute?: string; value?: string }>
  } | string
  stockLevel?: {
    id?: string
    location?: {
      id?: string
      name?: string
      type?: string
    } | string
  } | string
  tenant?: {
    id?: string
    name?: string
  } | string
}

export type OrderItemsTableProps = {
  items: OrderItemData[]
  currency: string
  canEdit?: boolean
  onEditItems?: () => void
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

export function OrderItemsTable({ items, currency, canEdit, onEditItems }: OrderItemsTableProps) {
  const [selectedStockItem, setSelectedStockItem] = useState<{
    productId: string
    productName: string
    variantId?: string | null
    variantName?: string | null
    sku?: string | null
    productImage?: string | null
  } | null>(null)

  if (!items || items.length === 0) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          background: 'var(--theme-elevation-0, #ffffff)',
          border: '1px solid var(--theme-elevation-150, #e2e8f0)',
          borderRadius: 12,
          color: 'var(--theme-elevation-500, #64748b)',
          marginBottom: '1.25rem',
        }}
      >
        No line items found for this order.
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'var(--theme-elevation-0, #ffffff)',
        border: '1px solid var(--theme-elevation-150, #e2e8f0)',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: '1.25rem',
      }}
    >
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--theme-text, #0f172a)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          Order Items ({items.length})
        </h2>

        {canEdit && onEditItems && (
          <button
            type="button"
            onClick={onEditItems}
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
            Edit Items
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            minWidth: 620,
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: 13,
          }}
        >
          <thead>
            <tr
              style={{
                background: 'var(--theme-elevation-50, #f8fafc)',
                borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
                color: 'var(--theme-elevation-600, #475569)',
                fontWeight: 600,
              }}
            >
              <th style={{ padding: '10px 14px' }}>Product</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Price</th>
              <th style={{ padding: '10px 14px', textAlign: 'center' }}>Qty</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const productObj = typeof item.product === 'object' && item.product !== null ? item.product : null
              const variantObj = typeof item.variant === 'object' && item.variant !== null ? item.variant : null

              const title = item.productName || item.productTitle || productObj?.title || 'Product Item'
              const variantTitle = item.variantName || variantObj?.title
              const sku = item.sku || variantObj?.sku || '-'
              const productId =
                typeof item.product === 'object' && item.product !== null
                  ? item.product.id
                  : typeof item.product === 'string'
                  ? item.product
                  : null
              const variantId =
                typeof item.variant === 'object' && item.variant !== null
                  ? item.variant.id
                  : typeof item.variant === 'string'
                  ? item.variant
                  : null

              const unitPrice =
                item.unitPrice != null
                  ? Number(item.unitPrice)
                  : item.price != null
                  ? Number(item.price)
                  : 0

              const quantity = item.quantity != null ? Number(item.quantity) : 1

              const totalPrice =
                item.totalPrice != null
                  ? Number(item.totalPrice)
                  : item.total != null
                  ? Number(item.total)
                  : item.subtotal != null
                  ? Number(item.subtotal)
                  : unitPrice * quantity

              // Resolve thumbnail image
              let imageUrl = item.productImage
              if (!imageUrl && productObj?.images && productObj.images.length > 0) {
                const firstImg = productObj.images[0]?.image
                if (typeof firstImg === 'object' && firstImg !== null) {
                  imageUrl = firstImg.sizes?.thumbnail?.url || firstImg.sizes?.card?.url || firstImg.url
                } else if (typeof firstImg === 'string') {
                  imageUrl = firstImg
                }
              }

              return (
                <tr
                  key={item.id || index}
                  style={{
                    borderBottom:
                      index === items.length - 1
                        ? 'none'
                        : '1px solid var(--theme-elevation-100, #f1f5f9)',
                    transition: 'background 0.15s ease',
                  }}
                >
                  {/* Product column */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 8,
                          background: 'var(--theme-elevation-100, #f1f5f9)',
                          border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--theme-elevation-400, #94a3b8)"
                            strokeWidth="1.5"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {productId ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedStockItem({
                                productId,
                                productName: title,
                                variantId,
                                variantName: variantTitle,
                                sku,
                                productImage: imageUrl,
                              })
                            }
                            title="Click to view real-time inventory and warehouse stock"
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              margin: 0,
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontWeight: 600,
                              color: 'var(--bs-primary, #2563eb)',
                              lineHeight: 1.3,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              textDecoration: 'none',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                          >
                            <span>{title}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.7 }}>
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </button>
                        ) : (
                          <span
                            style={{
                              fontWeight: 600,
                              color: 'var(--theme-text, #0f172a)',
                              lineHeight: 1.3,
                            }}
                          >
                            {title}
                          </span>
                        )}
                        {variantTitle && (
                          <span
                            style={{
                              fontSize: 12,
                              color: 'var(--theme-elevation-500, #64748b)',
                            }}
                          >
                            Variant: {variantTitle}
                          </span>
                        )}
                        {sku && sku !== '-' && (
                          <span
                            style={{
                              fontSize: 11,
                              fontFamily: 'monospace',
                              color: 'var(--theme-elevation-500, #64748b)',
                              fontWeight: 400,
                            }}
                          >
                            SKU: {sku}
                          </span>
                        )}
                        {item.tenant && typeof item.tenant === 'object' && item.tenant !== null && (
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--bs-primary, #2563eb)',
                              fontWeight: 500,
                            }}
                          >
                            Vendor: {item.tenant.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Unit price */}
                  <td
                    style={{
                      padding: '12px 14px',
                      verticalAlign: 'middle',
                      textAlign: 'right',
                      fontWeight: 500,
                      color: 'var(--theme-text, #0f172a)',
                    }}
                  >
                    {formatMoney(unitPrice, currency)}
                  </td>

                  {/* Quantity */}
                  <td
                    style={{
                      padding: '12px 14px',
                      verticalAlign: 'middle',
                      textAlign: 'center',
                      fontWeight: 600,
                      color: 'var(--theme-text, #0f172a)',
                    }}
                  >
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'var(--theme-elevation-100, #f1f5f9)',
                        border: '1px solid var(--theme-elevation-200, #e2e8f0)',
                        fontSize: 12,
                      }}
                    >
                      {quantity}
                    </span>
                  </td>

                  {/* Total */}
                  <td
                    style={{
                      padding: '12px 14px',
                      verticalAlign: 'middle',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: 'var(--theme-text, #0f172a)',
                    }}
                  >
                    {formatMoney(totalPrice, currency)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Product Stock Information Modal */}
      {selectedStockItem && (
        <ProductStockModal
          isOpen={true}
          productId={selectedStockItem.productId}
          productName={selectedStockItem.productName}
          variantId={selectedStockItem.variantId}
          variantName={selectedStockItem.variantName}
          sku={selectedStockItem.sku}
          productImage={selectedStockItem.productImage}
          onClose={() => setSelectedStockItem(null)}
        />
      )}
    </div>
  )
}
