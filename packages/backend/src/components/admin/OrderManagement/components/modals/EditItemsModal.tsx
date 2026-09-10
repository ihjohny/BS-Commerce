'use client'

import React, { useState } from 'react'
import type { OrderItemData } from '../OrderItemsTable'

export type EditableItem = {
  id: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  totalPrice: number
  isNew?: boolean
  productId?: string
  variantId?: string
  productSlug?: string
  productImage?: string
  variantName?: string
}

export type EditItemsModalProps = {
  isOpen: boolean
  initialItems: OrderItemData[]
  currency: string
  onClose: () => void
  onSave: (data: {
    items: EditableItem[]
    deletedItemIds: string[]
    subtotal: number
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

export function EditItemsModal({
  isOpen,
  initialItems,
  currency,
  onClose,
  onSave,
  saving,
}: EditItemsModalProps) {
  const [items, setItems] = useState<EditableItem[]>(() => {
    return (initialItems || []).map((item) => {
      const productObj = typeof item.product === 'object' && item.product !== null ? item.product : null
      const variantObj = typeof item.variant === 'object' && item.variant !== null ? item.variant : null
      const name = item.productName || item.productTitle || productObj?.title || 'Product Item'
      const sku = item.sku || variantObj?.sku || '-'
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
          : unitPrice * quantity

      return {
        id: item.id,
        productName: name,
        sku,
        quantity,
        unitPrice,
        totalPrice,
        productId:
          typeof item.product === 'object' && item.product
            ? item.product.id
            : typeof item.product === 'string'
            ? item.product
            : undefined,
        variantId:
          typeof item.variant === 'object' && item.variant
            ? item.variant.id
            : typeof item.variant === 'string'
            ? item.variant
            : undefined,
        productImage: item.productImage,
        variantName: item.variantName,
      }
    })
  })

  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([])

  // Add Item / Variant search modal state
  const [showAddPicker, setShowAddPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [loadingVariants, setLoadingVariants] = useState(false)
  const [productVariants, setProductVariants] = useState<any[]>([])
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null)
  const [newItemQty, setNewItemQty] = useState(1)
  const [newItemPrice, setNewItemPrice] = useState(0)

  if (!isOpen) return null

  // Calculate items subtotal dynamically
  const calculatedItemsSubtotal =
    items.length > 0
      ? items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0)
      : 0

  const handleItemChange = (index: number, field: 'quantity' | 'unitPrice', val: number) => {
    const updated = [...items]
    const cur = { ...updated[index] }
    if (field === 'quantity') {
      cur.quantity = Math.max(1, Math.floor(val))
    } else {
      cur.unitPrice = Math.max(0, val)
    }
    cur.totalPrice = cur.quantity * cur.unitPrice
    updated[index] = cur
    setItems(updated)
  }

  const handleRemoveItem = (index: number) => {
    const itemToRemove = items[index]
    if (!itemToRemove) return
    if (!itemToRemove.isNew && itemToRemove.id) {
      setDeletedItemIds((prev) => [...prev, itemToRemove.id])
    }
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSearchProducts = async (q: string) => {
    setSearchQuery(q)
    if (!q || q.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearchingProducts(true)
    try {
      const res = await fetch(`/api/products?where[name][like]=${encodeURIComponent(q)}&depth=1&limit=8`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.docs || [])
      }
    } catch {
      // ignore
    } finally {
      setSearchingProducts(false)
    }
  }

  const handleSelectProduct = async (prod: any) => {
    setSelectedProduct(prod)
    setSelectedVariant(null)
    setNewItemQty(1)
    const price = prod.basePrice ?? prod.price ?? 0
    setNewItemPrice(price)

    if (prod.hasVariants) {
      setLoadingVariants(true)
      try {
        const vRes = await fetch(`/api/product-variants?where[product][equals]=${prod.id}&depth=1&limit=50`)
        if (vRes.ok) {
          const vData = await vRes.json()
          setProductVariants(vData.docs || [])
          if (vData.docs && vData.docs.length > 0) {
            const firstV = vData.docs[0]
            setSelectedVariant(firstV)
            setNewItemPrice(firstV.price ?? price)
          }
        }
      } catch {
        // ignore
      } finally {
        setLoadingVariants(false)
      }
    } else {
      setProductVariants([])
    }
  }

  const handleSelectVariant = (variantId: string) => {
    const found = productVariants.find((v) => v.id === variantId)
    setSelectedVariant(found || null)
    if (found && found.price != null) {
      setNewItemPrice(found.price)
    } else if (selectedProduct) {
      setNewItemPrice(selectedProduct.basePrice ?? selectedProduct.price ?? 0)
    }
  }

  const handleConfirmAddItem = () => {
    if (!selectedProduct) return

    let imgUrl = ''
    if (selectedProduct.images && selectedProduct.images.length > 0) {
      const firstImg = selectedProduct.images[0]?.image
      if (typeof firstImg === 'object' && firstImg !== null) {
        imgUrl = firstImg.sizes?.thumbnail?.url || firstImg.sizes?.card?.url || firstImg.url || ''
      } else if (typeof firstImg === 'string') {
        imgUrl = firstImg
      }
    }

    const prodName =
      typeof selectedProduct.name === 'string'
        ? selectedProduct.name
        : typeof selectedProduct.title === 'string'
        ? selectedProduct.title
        : 'Product Item'

    const variantName = selectedVariant?.name || ''
    const sku = selectedVariant?.sku || selectedProduct.sku || `SKU-${Date.now().toString(36).toUpperCase()}`
    const unitPrice = Number(newItemPrice) || 0
    const qty = Math.max(1, Math.floor(newItemQty))

    const newItem: EditableItem = {
      id: `new-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      productName: prodName,
      sku,
      quantity: qty,
      unitPrice,
      totalPrice: unitPrice * qty,
      isNew: true,
      productId: selectedProduct.id,
      variantId: selectedVariant?.id || undefined,
      variantName: variantName || undefined,
      productImage: imgUrl,
      productSlug: selectedProduct.slug,
    }

    setItems((prev) => [...prev, newItem])

    // Reset picker state
    setShowAddPicker(false)
    setSelectedProduct(null)
    setSelectedVariant(null)
    setProductVariants([])
    setSearchQuery('')
    setSearchResults([])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      items,
      deletedItemIds,
      subtotal: calculatedItemsSubtotal,
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid var(--theme-elevation-200, #cbd5e1)',
    background: 'var(--theme-elevation-0, #ffffff)',
    color: 'var(--theme-text, #0f172a)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
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
          maxWidth: 880,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--theme-elevation-200, #cbd5e1)',
        }}
      >
        {/* Header */}
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
          <div>
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
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              Edit Order Items ({items.length})
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--theme-elevation-500, #64748b)' }}>
              Add new catalog products/variants, modify prices or quantities, or delete line items.
            </p>
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

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {/* Action Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--theme-elevation-700, #334155)' }}>
              Line Items
            </span>

            <button
              type="button"
              onClick={() => {
                setShowAddPicker(true)
                setSelectedProduct(null)
                setSelectedVariant(null)
                setSearchQuery('')
                setSearchResults([])
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: '1px solid var(--bs-primary, #2563eb)',
                background: 'var(--bs-primary-subtle, rgba(37, 99, 235, 0.08))',
                color: 'var(--bs-primary, #2563eb)',
                cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Item / Variant
            </button>
          </div>

          {/* Items Table */}
          {items.length === 0 ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--theme-elevation-500, #64748b)',
                fontSize: 13,
                background: 'var(--theme-elevation-50, #f8fafc)',
                borderRadius: 8,
                border: '1px dashed var(--theme-elevation-200, #cbd5e1)',
                marginBottom: '1.25rem',
              }}
            >
              All line items have been removed. Click <strong>"Add Item / Variant"</strong> above to add items.
            </div>
          ) : (
            <div
              style={{
                overflowX: 'auto',
                border: '1px solid var(--theme-elevation-150, #e2e8f0)',
                borderRadius: 8,
                marginBottom: '1.25rem',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr
                    style={{
                      background: 'var(--theme-elevation-50, #f8fafc)',
                      borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
                      color: 'var(--theme-elevation-600, #475569)',
                    }}
                  >
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Item</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', width: 130 }}>Unit Price ({currency})</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: 80 }}>Qty</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', width: 120 }}>Line Total</th>
                    <th style={{ padding: '8px 8px', textAlign: 'center', width: 44 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr
                      key={it.id || idx}
                      style={{ borderBottom: '1px solid var(--theme-elevation-100, #f1f5f9)' }}
                    >
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {it.productImage && (
                            <img
                              src={it.productImage}
                              alt={it.productName}
                              style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
                            />
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span>{it.productName}</span>
                              {it.isNew && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '2px 5px',
                                    borderRadius: 4,
                                    background: '#dcfce7',
                                    color: '#15803d',
                                  }}
                                >
                                  NEW
                                </span>
                              )}
                            </div>
                            {it.variantName && (
                              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--bs-primary, #2563eb)' }}>
                                Variant: {it.variantName}
                              </span>
                            )}
                            {it.sku && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontFamily: 'monospace',
                                  color: 'var(--theme-elevation-500, #64748b)',
                                  fontWeight: 400,
                                }}
                              >
                                SKU: {it.sku}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={it.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                          style={{ ...inputStyle, textAlign: 'right', padding: '4px 8px' }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={it.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          style={{ ...inputStyle, textAlign: 'center', padding: '4px 8px', width: 56, margin: '0 auto' }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--theme-text, #0f172a)' }}>
                        {formatMoney(it.totalPrice, currency)}
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          title="Remove item"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--bs-error, #dc2626)',
                            cursor: 'pointer',
                            padding: '4px 6px',
                            borderRadius: 4,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Subtotal Summary Banner */}
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--theme-elevation-50, #f8fafc)',
              borderRadius: 8,
              border: '1px solid var(--theme-elevation-150, #e2e8f0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 13,
              marginBottom: '1.25rem',
            }}
          >
            <span style={{ color: 'var(--theme-elevation-600, #475569)' }}>New Calculated Items Subtotal:</span>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--theme-text, #0f172a)' }}>
              {formatMoney(calculatedItemsSubtotal, currency)}
            </span>
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
              {saving ? 'Saving...' : 'Save Items & Recalculate'}
            </button>
          </div>
        </form>

        {/* Add Product / Variant Submodal */}
        {showAddPicker && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '1rem',
            }}
          >
            <div
              style={{
                background: 'var(--theme-elevation-0, #ffffff)',
                borderRadius: 12,
                width: '100%',
                maxWidth: 540,
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '1.5rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--theme-elevation-200, #cbd5e1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--theme-text, #0f172a)' }}>
                  Add Product / Variant to Order
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddPicker(false)}
                  style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--theme-elevation-500, #64748b)' }}
                >
                  ✕
                </button>
              </div>

              {/* Search */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--theme-elevation-700, #334155)', marginBottom: 4 }}>
                  Search Catalog Products
                </label>
                <input
                  type="text"
                  placeholder="Type product name to search..."
                  value={searchQuery}
                  onChange={(e) => handleSearchProducts(e.target.value)}
                  style={inputStyle}
                  autoFocus
                />
                {searchingProducts && (
                  <div style={{ fontSize: 12, color: 'var(--theme-elevation-500, #64748b)', marginTop: 4 }}>
                    Searching products...
                  </div>
                )}

                {/* Results dropdown */}
                {searchResults.length > 0 && !selectedProduct && (
                  <div
                    style={{
                      marginTop: 6,
                      border: '1px solid var(--theme-elevation-200, #cbd5e1)',
                      borderRadius: 8,
                      maxHeight: 200,
                      overflowY: 'auto',
                      background: 'var(--theme-elevation-50, #f8fafc)',
                    }}
                  >
                    {searchResults.map((prod) => {
                      const title = typeof prod.name === 'string' ? prod.name : prod.title || 'Product'
                      const price = prod.basePrice ?? prod.price ?? 0
                      return (
                        <div
                          key={prod.id}
                          onClick={() => handleSelectProduct(prod)}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--theme-elevation-100, #f1f5f9)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: 13,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--theme-elevation-150, #e2e8f0)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>{title}</div>
                            <div style={{ fontSize: 11, color: 'var(--theme-elevation-500, #64748b)' }}>
                              SKU: {prod.sku || '-'} {prod.hasVariants ? '• (Has Variants)' : ''}
                            </div>
                          </div>
                          <div style={{ fontWeight: 700, color: 'var(--bs-primary, #2563eb)' }}>
                            {formatMoney(Number(price), currency)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Selected Product Card */}
              {selectedProduct && (
                <div
                  style={{
                    padding: '12px',
                    background: 'var(--bs-primary-subtle, rgba(37, 99, 235, 0.06))',
                    border: '1px solid var(--bs-primary, #2563eb)',
                    borderRadius: 8,
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, color: 'var(--bs-primary, #2563eb)' }}>
                        Selected Product
                      </span>
                      <h5 style={{ margin: '2px 0', fontSize: 14, fontWeight: 700, color: 'var(--theme-text, #0f172a)' }}>
                        {typeof selectedProduct.name === 'string' ? selectedProduct.name : selectedProduct.title}
                      </h5>
                      <div style={{ fontSize: 12, color: 'var(--theme-elevation-600, #475569)' }}>
                        SKU: {selectedProduct.sku || '-'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null)
                        setSelectedVariant(null)
                        setProductVariants([])
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: 12,
                        color: 'var(--bs-error, #dc2626)',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Change
                    </button>
                  </div>

                  {/* Variants */}
                  {selectedProduct.hasVariants && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--theme-elevation-700, #334155)', marginBottom: 4 }}>
                        Select Variant
                      </label>
                      {loadingVariants ? (
                        <div style={{ fontSize: 12, color: 'var(--theme-elevation-500, #64748b)' }}>Loading variants...</div>
                      ) : productVariants.length > 0 ? (
                        <select
                          value={selectedVariant?.id || ''}
                          onChange={(e) => handleSelectVariant(e.target.value)}
                          style={inputStyle}
                        >
                          {productVariants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} (SKU: {v.sku}) - {formatMoney(Number(v.price), currency)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--theme-elevation-500, #64748b)' }}>
                          No variants configured for this product. Defaulting to base product.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price & Quantity */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--theme-elevation-700, #334155)', marginBottom: 4 }}>
                        Unit Price ({currency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(Number(e.target.value))}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--theme-elevation-700, #334155)', marginBottom: 4 }}>
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(Math.max(1, Number(e.target.value)))}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--theme-text, #0f172a)' }}>
                    Total: {formatMoney(newItemPrice * newItemQty, currency)}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddPicker(false)}
                  style={{
                    padding: '8px 14px',
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
                  type="button"
                  disabled={!selectedProduct}
                  onClick={handleConfirmAddItem}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--bs-primary, #2563eb)',
                    color: '#ffffff',
                    cursor: !selectedProduct ? 'not-allowed' : 'pointer',
                    opacity: !selectedProduct ? 0.6 : 1,
                  }}
                >
                  Add to Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
