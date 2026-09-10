'use client'

import React, { useState } from 'react'
import type { AddressData } from './FulfillmentCard'
import type { OrderItemData } from './OrderItemsTable'

export type StoreOption = {
  id: string
  name: string
  address?: {
    city?: string
    state?: string
  }
}

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

export type OrderEditFormData = {
  status: string
  paymentStatus: string
  storeId?: string | null
  shippingAddress: AddressData
  billingAddress: AddressData
  shippingTotal: number
  taxTotal: number
  subtotal: number
  grandTotal: number
  notes?: string
  editedItems?: EditableItem[]
  deletedItemIds?: string[]
}

export type OrderEditFormProps = {
  initialData: {
    id?: string
    status: string
    paymentStatus: string
    store?: { id: string; name: string } | string | null
    shippingAddress: AddressData
    billingAddress: AddressData
    subtotal: number
    shippingTotal: number
    taxTotal: number
    discountTotal: number
    currency: string
    notes?: string
    items?: OrderItemData[]
  }
  stores?: StoreOption[]
  onSave: (data: Partial<OrderEditFormData>) => Promise<void>
  onCancel: () => void
  saving: boolean
  error?: string | null
}

const ALL_ORDER_STATUSES = [
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Partially Shipped', value: 'partially-shipped' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Refunded', value: 'refunded' },
]

const ALL_PAYMENT_STATUSES = [
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Paid', value: 'paid' },
  { label: 'Partially Refunded', value: 'partially-refunded' },
  { label: 'Refunded', value: 'refunded' },
]

export function OrderEditForm({
  initialData,
  stores,
  onSave,
  onCancel,
  saving,
  error,
}: OrderEditFormProps) {
  const [status, setStatus] = useState(initialData.status)
  const [paymentStatus, setPaymentStatus] = useState(initialData.paymentStatus)
  const [storeId, setStoreId] = useState<string>(
    typeof initialData.store === 'object' && initialData.store !== null
      ? initialData.store.id
      : typeof initialData.store === 'string'
      ? initialData.store
      : ''
  )

  // Items editing state
  const isBeforeComplete = !['completed', 'delivered', 'cancelled', 'refunded'].includes(
    initialData.status.toLowerCase()
  )

  const [items, setItems] = useState<EditableItem[]>(() => {
    return (initialData.items || []).map((item) => {
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
        productId: typeof item.product === 'object' && item.product ? item.product.id : typeof item.product === 'string' ? item.product : undefined,
        variantId: typeof item.variant === 'object' && item.variant ? item.variant.id : typeof item.variant === 'string' ? item.variant : undefined,
        productImage: item.productImage,
        variantName: item.variantName,
      }
    })
  })

  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([])

  // Add Item Modal / Search State
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [loadingVariants, setLoadingVariants] = useState(false)
  const [productVariants, setProductVariants] = useState<any[]>([])
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null)
  const [newItemQty, setNewItemQty] = useState(1)
  const [newItemPrice, setNewItemPrice] = useState(0)

  const [shippingAddress, setShippingAddress] = useState<AddressData>({
    firstName: initialData.shippingAddress?.firstName || '',
    lastName: initialData.shippingAddress?.lastName || '',
    street1: initialData.shippingAddress?.street1 || '',
    street2: initialData.shippingAddress?.street2 || '',
    city: initialData.shippingAddress?.city || '',
    state: initialData.shippingAddress?.state || '',
    postalCode: initialData.shippingAddress?.postalCode || '',
    country: initialData.shippingAddress?.country || '',
    phone: initialData.shippingAddress?.phone || '',
  })

  const [billingAddress, setBillingAddress] = useState<AddressData>({
    firstName: initialData.billingAddress?.firstName || '',
    lastName: initialData.billingAddress?.lastName || '',
    street1: initialData.billingAddress?.street1 || '',
    street2: initialData.billingAddress?.street2 || '',
    city: initialData.billingAddress?.city || '',
    state: initialData.billingAddress?.state || '',
    postalCode: initialData.billingAddress?.postalCode || '',
    country: initialData.billingAddress?.country || '',
    phone: initialData.billingAddress?.phone || '',
  })

  const [shippingTotal, setShippingTotal] = useState<number>(initialData.shippingTotal || 0)
  const [taxTotal, setTaxTotal] = useState<number>(initialData.taxTotal || 0)
  const [notes, setNotes] = useState<string>(initialData.notes || '')

  // Calculate items subtotal
  const calculatedItemsSubtotal = items.length > 0
    ? items.reduce((sum, it) => sum + (it.unitPrice * it.quantity), 0)
    : 0

  // Calculate preview grand total
  const calculatedGrandTotal = Math.max(
    0,
    calculatedItemsSubtotal + Number(shippingTotal) + Number(taxTotal) - (initialData.discountTotal || 0)
  )

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

  // Handle live search for products
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

    // Check if product has variants
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

    const prodName = typeof selectedProduct.name === 'string'
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

    // Reset modal state
    setShowAddModal(false)
    setSelectedProduct(null)
    setSelectedVariant(null)
    setProductVariants([])
    setSearchQuery('')
    setSearchResults([])
  }

  const handleCopyShippingToBilling = () => {
    setBillingAddress({ ...shippingAddress })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      status,
      paymentStatus,
      storeId: storeId || null,
      shippingAddress,
      billingAddress,
      shippingTotal: Number(shippingTotal),
      taxTotal: Number(taxTotal),
      subtotal: calculatedItemsSubtotal,
      grandTotal: calculatedGrandTotal,
      notes,
      editedItems: isBeforeComplete ? items : undefined,
      deletedItemIds: isBeforeComplete ? deletedItemIds : undefined,
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
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'var(--theme-elevation-0, #ffffff)',
        border: '1px solid var(--theme-elevation-200, #cbd5e1)',
        borderRadius: 12,
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)',
          paddingBottom: '1rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '1.15rem',
              fontWeight: 700,
              color: 'var(--theme-text, #0f172a)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Edit Order Details
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--theme-elevation-500, #64748b)' }}>
            Update fulfillment statuses, line item quantities/prices (before completion), addresses, or routing.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
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
            type="submit"
            disabled={saving}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
              border: 'none',
              background: 'var(--bs-primary, #2563eb)',
              color: '#ffffff',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {saving ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: 'var(--bs-error-subtle, rgba(220, 38, 38, 0.12))',
            border: '1px solid var(--bs-error, #dc2626)',
            color: 'var(--bs-error, #dc2626)',
            fontSize: 13,
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Grid: Status & Routing */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'var(--theme-elevation-50, #f8fafc)',
          borderRadius: 10,
          border: '1px solid var(--theme-elevation-150, #e2e8f0)',
        }}
      >
        <div>
          <label style={labelStyle}>Order Fulfillment Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={inputStyle}
          >
            {ALL_ORDER_STATUSES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Payment Status</label>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            style={inputStyle}
          >
            {ALL_PAYMENT_STATUSES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Order Items Editing (Allowed before completion) */}
      {isBeforeComplete && (
        <div
          style={{
            border: '1px solid var(--theme-elevation-150, #e2e8f0)',
            borderRadius: 10,
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: 'var(--theme-text, #0f172a)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                </svg>
                Edit Order Line Items ({items.length})
              </h3>
              <span style={{ fontSize: 12, color: 'var(--theme-elevation-500, #64748b)' }}>
                Add items/variants, adjust quantity or price, or remove items. Totals recalculate in real-time.
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAddModal(true)
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

          {items.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--theme-elevation-500, #64748b)', fontSize: 13, background: 'var(--theme-elevation-50, #f8fafc)', borderRadius: 8 }}>
              No line items in order. Click <strong>&ldquo;Add Item / Variant&rdquo;</strong> above to add products.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--theme-elevation-50, #f8fafc)', borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)', color: 'var(--theme-elevation-600, #475569)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Item</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>SKU</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', width: 130 }}>Unit Price ({initialData.currency})</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: 90 }}>Qty</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', width: 130 }}>Line Total</th>
                    <th style={{ padding: '8px 8px', textAlign: 'center', width: 44 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={it.id || idx} style={{ borderBottom: '1px solid var(--theme-elevation-100, #f1f5f9)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--theme-text, #0f172a)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {it.productImage && (
                            <img
                              src={it.productImage}
                              alt={it.productName}
                              style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
                            />
                          )}
                          <div>
                            <div>{it.productName}</div>
                            {it.variantName && (
                              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--bs-primary, #2563eb)' }}>
                                Variant: {it.variantName}
                              </span>
                            )}
                            {it.isNew && (
                              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: '#dcfce7', color: '#15803d' }}>
                                NEW
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--theme-elevation-600, #475569)' }}>
                        {it.sku}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
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
                          style={{ ...inputStyle, textAlign: 'center', padding: '4px 8px', width: 64, margin: '0 auto' }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--theme-text, #0f172a)' }}>
                        {initialData.currency} {it.totalPrice.toFixed(2)}
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

          {/* Add Item Dialog Modal */}
          {showAddModal && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(15, 23, 42, 0.5)',
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
                  maxWidth: 580,
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  padding: '1.5rem',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  border: '1px solid var(--theme-elevation-200, #cbd5e1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--theme-text, #0f172a)' }}>
                    Add Product / Variant to Order
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--theme-elevation-500, #64748b)' }}
                  >
                    ✕
                  </button>
                </div>

                {/* Step 1: Search Product */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={labelStyle}>Search Catalog Products</label>
                  <input
                    type="text"
                    placeholder="Type at least 2 characters to search product..."
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

                  {/* Search Results Dropdown List */}
                  {searchResults.length > 0 && !selectedProduct && (
                    <div
                      style={{
                        marginTop: 6,
                        border: '1px solid var(--theme-elevation-200, #cbd5e1)',
                        borderRadius: 8,
                        maxHeight: 220,
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
                              transition: 'background 0.15s ease',
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
                              {initialData.currency} {Number(price).toFixed(2)}
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
                        <h4 style={{ margin: '2px 0', fontSize: 14, fontWeight: 700, color: 'var(--theme-text, #0f172a)' }}>
                          {typeof selectedProduct.name === 'string' ? selectedProduct.name : selectedProduct.title}
                        </h4>
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

                    {/* Variant Selector if product has variants */}
                    {selectedProduct.hasVariants && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <label style={labelStyle}>Select Variant</label>
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
                                {v.name} (SKU: {v.sku}) - {initialData.currency} {Number(v.price).toFixed(2)}
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

                    {/* Pricing & Quantity Inputs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                      <div>
                        <label style={labelStyle}>Unit Price ({initialData.currency})</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newItemPrice}
                          onChange={(e) => setNewItemPrice(Number(e.target.value))}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Quantity</label>
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
                      Total: {initialData.currency} {(newItemPrice * newItemQty).toFixed(2)}
                    </div>
                  </div>
                )}

                {/* Modal Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
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
      )}

      {/* Addresses Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Shipping Address Inputs */}
        <div
          style={{
            border: '1px solid var(--theme-elevation-150, #e2e8f0)',
            borderRadius: 10,
            padding: '1rem',
          }}
        >
          <h3
            style={{
              margin: '0 0 1rem 0',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--theme-text, #0f172a)',
            }}
          >
            Shipping Address
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>First Name *</label>
              <input
                type="text"
                required
                value={shippingAddress.firstName || ''}
                onChange={(e) => setShippingAddress({ ...shippingAddress, firstName: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Last Name *</label>
              <input
                type="text"
                required
                value={shippingAddress.lastName || ''}
                onChange={(e) => setShippingAddress({ ...shippingAddress, lastName: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Street Address 1 *</label>
            <input
              type="text"
              required
              value={shippingAddress.street1 || ''}
              onChange={(e) => setShippingAddress({ ...shippingAddress, street1: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Street Address 2 (Apt, Suite, Unit)</label>
            <input
              type="text"
              value={shippingAddress.street2 || ''}
              onChange={(e) => setShippingAddress({ ...shippingAddress, street2: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>City *</label>
              <input
                type="text"
                required
                value={shippingAddress.city || ''}
                onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>State / Division</label>
              <input
                type="text"
                value={shippingAddress.state || ''}
                onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Postal Code</label>
              <input
                type="text"
                value={shippingAddress.postalCode || ''}
                onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Country *</label>
              <input
                type="text"
                required
                value={shippingAddress.country || ''}
                onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Contact Phone</label>
            <input
              type="text"
              value={shippingAddress.phone || ''}
              onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Billing Address Inputs */}
        <div
          style={{
            border: '1px solid var(--theme-elevation-150, #e2e8f0)',
            borderRadius: 10,
            padding: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3
              style={{
                margin: 0,
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--theme-text, #0f172a)',
              }}
            >
              Billing Address
            </h3>

            <button
              type="button"
              onClick={handleCopyShippingToBilling}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--bs-primary, #2563eb)',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Copy from Shipping
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>First Name *</label>
              <input
                type="text"
                required
                value={billingAddress.firstName || ''}
                onChange={(e) => setBillingAddress({ ...billingAddress, firstName: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Last Name *</label>
              <input
                type="text"
                required
                value={billingAddress.lastName || ''}
                onChange={(e) => setBillingAddress({ ...billingAddress, lastName: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Street Address 1 *</label>
            <input
              type="text"
              required
              value={billingAddress.street1 || ''}
              onChange={(e) => setBillingAddress({ ...billingAddress, street1: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Street Address 2 (Apt, Suite, Unit)</label>
            <input
              type="text"
              value={billingAddress.street2 || ''}
              onChange={(e) => setBillingAddress({ ...billingAddress, street2: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>City *</label>
              <input
                type="text"
                required
                value={billingAddress.city || ''}
                onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>State / Division</label>
              <input
                type="text"
                value={billingAddress.state || ''}
                onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Postal Code</label>
              <input
                type="text"
                value={billingAddress.postalCode || ''}
                onChange={(e) => setBillingAddress({ ...billingAddress, postalCode: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Country *</label>
              <input
                type="text"
                required
                value={billingAddress.country || ''}
                onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Contact Phone</label>
            <input
              type="text"
              value={billingAddress.phone || ''}
              onChange={(e) => setBillingAddress({ ...billingAddress, phone: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Financial Adjustments & Notes */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            border: '1px solid var(--theme-elevation-150, #e2e8f0)',
            borderRadius: 10,
            padding: '1rem',
          }}
        >
          <h3
            style={{
              margin: '0 0 0.75rem 0',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--theme-text, #0f172a)',
            }}
          >
            Financial Adjustments
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Shipping Fee ({initialData.currency})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={shippingTotal}
                onChange={(e) => setShippingTotal(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Tax Total ({initialData.currency})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={taxTotal}
                onChange={(e) => setTaxTotal(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.5rem 0.75rem',
              background: 'var(--theme-elevation-50, #f8fafc)',
              borderRadius: 6,
              fontSize: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              color: 'var(--theme-elevation-700, #334155)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Items Subtotal:</span>
              <span style={{ fontWeight: 600 }}>
                {initialData.currency} {calculatedItemsSubtotal.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--theme-elevation-200, #cbd5e1)', paddingTop: 4 }}>
              <span style={{ fontWeight: 700, color: 'var(--theme-text, #0f172a)' }}>Preview Grand Total:</span>
              <span style={{ fontWeight: 800, color: 'var(--theme-text, #0f172a)' }}>
                {initialData.currency} {calculatedGrandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            border: '1px solid var(--theme-elevation-150, #e2e8f0)',
            borderRadius: 10,
            padding: '1rem',
          }}
        >
          <h3
            style={{
              margin: '0 0 0.75rem 0',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--theme-text, #0f172a)',
            }}
          >
            Order & Customer Notes
          </h3>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add delivery instructions or administrative remarks..."
            style={{
              ...inputStyle,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* Footer Submit */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          borderTop: '1px solid var(--theme-elevation-150, #e2e8f0)',
          paddingTop: '1rem',
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          style={{
            padding: '9px 16px',
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
            padding: '9px 20px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            border: 'none',
            background: 'var(--bs-primary, #2563eb)',
            color: '#ffffff',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {saving ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
