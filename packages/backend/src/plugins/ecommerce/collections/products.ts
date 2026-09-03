import type { CollectionBeforeValidateHook, CollectionConfig, Payload } from 'payload'
import { randomBytes } from 'node:crypto'
import { isAdmin } from '../../../access/is-admin'
import { isAdminOrVendorOwner } from '../../../access/is-admin-or-vendor-owner'
import { slugField } from '../../../fields/slug'
import { getCurrencyOptions, getDefaultCurrency } from '../../../lib/currencies'

type SkuAutofillPolicy = 'always' | 'on-publish' | 'never'

function sanitizeSkuPart(raw: string, maxLen: number): string {
  const s = raw
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
  return s.length > 0 ? s.toUpperCase() : 'X'
}

async function isProductSkuTaken(
  payload: Payload,
  sku: string,
  excludeProductId?: string | number | null,
): Promise<boolean> {
  const { docs } = await payload.find({
    collection: 'products',
    where: { sku: { equals: sku } },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  })
  if (docs.length === 0) return false
  if (
    docs.length === 1 &&
    excludeProductId != null &&
    String((docs[0] as { id?: string | number }).id) === String(excludeProductId)
  ) {
    return false
  }
  return true
}

async function generateUniqueProductSku(args: {
  payload: Payload
  source: string
  excludeProductId?: string | number | null
}): Promise<string> {
  const { payload, source, excludeProductId } = args
  const base = sanitizeSkuPart(source, 64)

  for (let attempt = 0; attempt < 16; attempt++) {
    const entropy =
      attempt === 0 ? '' : `-${randomBytes(3).toString('hex').toUpperCase()}`
    const candidate = `${base}${entropy}`.replace(/-+/g, '-').slice(0, 96)
    if (!(await isProductSkuTaken(payload, candidate, excludeProductId))) {
      return candidate
    }
  }

  return `${base}-${randomBytes(8).toString('hex').toUpperCase()}`.slice(0, 96)
}

function getSkuAutofillPolicy(): SkuAutofillPolicy {
  const raw = process.env.SKU_AUTOFILL_POLICY?.trim().toLowerCase()
  if (raw === 'always' || raw === 'on-publish' || raw === 'never') {
    return raw
  }
  return 'on-publish'
}

function toId(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return id == null ? null : String(id)
  }
  return String(value)
}

function normalizeTenantId(value: unknown): string | null {
  const id = toId(value)
  if (!id) return null
  return id
}

const autoAssignTenantForVendor: CollectionBeforeValidateHook = ({ data, req }) => {
  if (!data) return data
  if (req.user?.role === 'vendor' && req.user.tenant && !data.tenant) {
    const tenantId = typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user.tenant
    data.tenant = tenantId
  }
  return data
}

const ensureProductSkuAutofill: CollectionBeforeValidateHook = async ({
  data,
  req,
  originalDoc,
}) => {
  if (!data || typeof data !== 'object') {
    return data
  }
  const d = data as Record<string, unknown>
  const skuVal = d.sku
  const skuMissing = skuVal == null || (typeof skuVal === 'string' && skuVal.trim() === '')
  if (skuMissing && d.sku == null) {
    d.sku = null
  }
  if (typeof skuVal === 'string' && skuVal.trim() === '') {
    // Keep optional SKU truly optional by normalizing blank input to null.
    d.sku = null
  }
  if (!skuMissing) {
    return data
  }
  if (!req.payload) {
    return data
  }

  const policy = getSkuAutofillPolicy()
  if (policy === 'never') {
    return data
  }

  const nextStatus = String(d.status ?? (originalDoc as Record<string, unknown> | undefined)?.status ?? 'draft')
  if (policy === 'on-publish' && nextStatus !== 'published') {
    return data
  }

  const fromSlug = typeof d.slug === 'string' && d.slug.trim() ? d.slug.trim() : ''
  const fromName = typeof d.name === 'string' && d.name.trim() ? d.name.trim() : ''
  const source = fromSlug || fromName || 'product'

  d.sku = await generateUniqueProductSku({
    payload: req.payload,
    source,
    excludeProductId: originalDoc?.id ?? null,
  })
  return data
}

function enforceBundleRules(multivendorEnabled: boolean): CollectionBeforeValidateHook {
  return async ({ data, req }) => {
    if (!data || typeof data !== 'object') {
      return data
    }

    const productTypeRaw = (data as Record<string, unknown>).productType
    const productType = productTypeRaw === 'bundle' ? 'bundle' : 'standard'
    if (productType !== 'bundle') {
      return data
    }

    // Bundles are single sellable SKUs; variants would break one-line checkout assumptions.
    ;(data as Record<string, unknown>).hasVariants = false

    const status = String((data as Record<string, unknown>).status ?? 'draft')
    const rawItems = (data as Record<string, unknown>).bundleItems
    const bundleItems = Array.isArray(rawItems) ? rawItems : []

    if (status === 'published' && bundleItems.length === 0) {
      throw new Error('Published bundle products require at least one bundle item.')
    }

    if (!req.payload) {
      return data
    }

    const bundleOwnerTenantId = normalizeTenantId((data as Record<string, unknown>).tenant)
    const isPlatformBundle = bundleOwnerTenantId == null

    for (const row of bundleItems) {
      if (!row || typeof row !== 'object') {
        throw new Error('Each bundle item must be a valid object.')
      }
      const item = row as Record<string, unknown>
      const childProductId = toId(item.product)
      if (!childProductId) {
        throw new Error('Each bundle item requires a product.')
      }

      const childProduct = (await req.payload.findByID({
        collection: 'products',
        id: childProductId,
        depth: 0,
        overrideAccess: true,
      })) as Record<string, unknown> | null
      if (!childProduct) {
        throw new Error(`Bundle item product not found: ${childProductId}`)
      }

      const childType = String(childProduct.productType ?? 'standard')
      if (childType === 'bundle') {
        throw new Error('Nested bundles are not allowed in bundle items.')
      }

      if (status === 'published' && String(childProduct.status ?? 'draft') !== 'published') {
        throw new Error(`Published bundles can only include published products (item: ${childProductId}).`)
      }

      const qty = Number(item.quantity)
      if (!Number.isFinite(qty) || qty < 1) {
        throw new Error('Each bundle item quantity must be at least 1.')
      }

      if (multivendorEnabled) {
        const childTenantId = normalizeTenantId(childProduct.tenant)
        if (isPlatformBundle) {
          if (childTenantId != null) {
            throw new Error('Platform-owned bundles can only include platform-owned products.')
          }
        } else if (childTenantId !== bundleOwnerTenantId) {
          throw new Error('Bundle items must belong to the same vendor as the bundle product.')
        }
      }

      const variantId = toId(item.variant)
      if (variantId) {
        const variant = (await req.payload.findByID({
          collection: 'product-variants',
          id: variantId,
          depth: 0,
          overrideAccess: true,
        })) as Record<string, unknown> | null
        if (!variant) {
          throw new Error(`Bundle item variant not found: ${variantId}`)
        }
        const variantProductId = toId(variant.product)
        if (variantProductId !== childProductId) {
          throw new Error(`Bundle item variant ${variantId} does not belong to product ${childProductId}.`)
        }
        if (status === 'published' && variant.isActive === false) {
          throw new Error(`Published bundles can only include active variants (item variant: ${variantId}).`)
        }
      }
    }

    return data
  }
}

export function createProductsConfig(multivendorEnabled = false): CollectionConfig {
  const fields: CollectionConfig['fields'] = [
    { name: 'name', type: 'text', required: true, localized: true },
    slugField('name'),
    {
      name: 'description',
      type: 'richText',
      localized: true,
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      localized: true,
    },
    { name: 'sku', type: 'text' },
    {
      name: 'productType',
      type: 'select',
      required: true,
      defaultValue: 'standard',
      options: [
        { label: 'Standard', value: 'standard' },
        { label: 'Bundle', value: 'bundle' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Pending Review', value: 'pending-review' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
    },
    { name: 'featured', type: 'checkbox', defaultValue: false },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
    },
    {
      name: 'attributes',
      type: 'relationship',
      relationTo: 'attributes',
      hasMany: true,
      admin: {
        description: 'Brand, Manufacturer, Series, and dynamic attributes tagged to this product.',
      },
    },
    {
      name: 'tags',
      type: 'array',
      fields: [{ name: 'tag', type: 'text' }],
    },
    {
      name: 'images',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    { name: 'basePrice', type: 'number', required: true, min: 0 },
    { name: 'compareAtPrice', type: 'number', min: 0 },
    {
      name: 'saleDisplayMode',
      type: 'select',
      required: true,
      defaultValue: 'strike_through',
      options: [
        { label: 'None (hide compare-at & badges)', value: 'none' },
        { label: 'Strikethrough compare-at only', value: 'strike_through' },
        { label: 'Badge: % off', value: 'badge_percent' },
        { label: 'Badge: amount saved', value: 'badge_amount' },
        { label: 'Strikethrough + badge', value: 'strike_and_badge' },
      ],
      admin: {
        description:
          'How to show savings when compare-at price is higher than selling price. Variants can override.',
      },
    },
    { name: 'costPrice', type: 'number', min: 0 },
    {
      name: 'currency',
      type: 'select',
      required: true,
      defaultValue: getDefaultCurrency(),
      options: getCurrencyOptions(),
    },
    { name: 'taxable', type: 'checkbox', defaultValue: true },
    { name: 'weight', type: 'number', min: 0 },
    {
      name: 'dimensions',
      type: 'group',
      fields: [
        { name: 'length', type: 'number', min: 0 },
        { name: 'width', type: 'number', min: 0 },
        { name: 'height', type: 'number', min: 0 },
      ],
    },
    { name: 'hasVariants', type: 'checkbox', defaultValue: false },
    {
      name: 'bundleItems',
      type: 'array',
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
        },
        {
          name: 'variant',
          type: 'relationship',
          relationTo: 'product-variants',
        },
        { name: 'quantity', type: 'number', required: true, min: 1, defaultValue: 1 },
      ],
    },
    {
      name: 'meta',
      type: 'group',
      label: 'SEO',
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'description', type: 'textarea', localized: true },
        { name: 'image', type: 'upload', relationTo: 'media' },
      ],
    },
    { name: 'publishedAt', type: 'date' },
    {
      name: 'rating',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true, description: 'Aggregated from approved product reviews.' },
    },
    {
      name: 'totalReviews',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true, description: 'Total approved product reviews.' },
    },
  ]

  if (multivendorEnabled) {
    fields.unshift({
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      admin: { description: 'Vendor (tenant) who owns this product.' },
    })
  }

  return {
    slug: 'products',
    admin: {
      useAsTitle: 'name',
      defaultColumns: multivendorEnabled
        ? ['name', 'slug', 'tenant', 'status', 'basePrice', 'currency', 'publishedAt']
        : ['name', 'slug', 'status', 'basePrice', 'currency', 'publishedAt'],
      group: 'Ecommerce',
    },
    access: {
      create: multivendorEnabled ? isAdminOrVendorOwner : isAdmin,
      read: ({ req }) => {
        if (!req.user) return { status: { equals: 'published' } }
        if (req.user.role === 'admin') return true
        if (multivendorEnabled && req.user.role === 'vendor') return isAdminOrVendorOwner({ req })
        return { status: { equals: 'published' } }
      },
      update: multivendorEnabled ? isAdminOrVendorOwner : isAdmin,
      delete: multivendorEnabled ? isAdminOrVendorOwner : isAdmin,
    },
    hooks: {
      beforeValidate: [
        ...(multivendorEnabled ? [autoAssignTenantForVendor] : []),
        ensureProductSkuAutofill,
        enforceBundleRules(multivendorEnabled),
      ],
    },
    fields,
    timestamps: true,
  }
}

/** @deprecated Use createProductsConfig(multivendorEnabled) */
export const Products: CollectionConfig = createProductsConfig(false)
