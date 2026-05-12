import { randomBytes } from 'node:crypto'
import type { CollectionBeforeValidateHook, CollectionConfig, Payload } from 'payload'
import { isAdmin } from '../../../access/is-admin'
import { isAdminOrVendorOwner } from '../../../access/is-admin-or-vendor-owner'

function sanitizeSkuPart(raw: string, maxLen: number): string {
  const s = raw
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
  return s.length > 0 ? s.toUpperCase() : 'X'
}

async function isVariantSkuTaken(
  payload: Payload,
  sku: string,
  excludeVariantId?: string | number | null,
): Promise<boolean> {
  const { docs } = await payload.find({
    collection: 'product-variants',
    where: { sku: { equals: sku } },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  })
  if (docs.length === 0) return false
  if (
    docs.length === 1 &&
    excludeVariantId != null &&
    String(docs[0].id) === String(excludeVariantId)
  ) {
    return false
  }
  return true
}

async function generateUniqueVariantSku(args: {
  payload: Payload
  productId: string
  variantName: string
  excludeVariantId?: string | number | null
}): Promise<string> {
  const { payload, productId, variantName, excludeVariantId } = args

  const product = await payload.findByID({
    collection: 'products',
    id: productId,
    depth: 0,
    overrideAccess: true,
  })

  const slugFromProduct =
    product &&
    typeof product === 'object' &&
    product !== null &&
    'slug' in product &&
    typeof (product as Record<string, unknown>).slug === 'string'
      ? String((product as Record<string, unknown>).slug).trim()
      : ''
  const slugRaw = slugFromProduct.length > 0 ? slugFromProduct : String(productId)

  const base = sanitizeSkuPart(slugRaw, 48)
  const namePart = sanitizeSkuPart(variantName || 'V', 32)

  for (let attempt = 0; attempt < 16; attempt++) {
    const entropy =
      attempt === 0 ? '' : `-${randomBytes(3).toString('hex').toUpperCase()}`
    const candidate = `${base}-${namePart}${entropy}`.replace(/-+/g, '-').slice(0, 96)

    if (!(await isVariantSkuTaken(payload, candidate, excludeVariantId))) {
      return candidate
    }
  }

  return `${base}-${randomBytes(8).toString('hex').toUpperCase()}`.slice(0, 96)
}

/** Admin placeholder copy promises auto-generated SKU when left blank — enforce here. */
const ensureVariantSkuAutofill: CollectionBeforeValidateHook = async ({
  data,
  req,
  originalDoc,
}) => {
  if (!data || typeof data !== 'object') return data
  const d = data as Record<string, unknown>
  const skuVal = d.sku
  const skuMissing = skuVal == null || (typeof skuVal === 'string' && skuVal.trim() === '')
  if (!skuMissing) return data

  const productRef = d.product
  const productId =
    typeof productRef === 'object' && productRef && 'id' in productRef
      ? String((productRef as { id: string }).id)
      : productRef != null
        ? String(productRef)
        : null

  if (!productId || !req.payload) return data

  const name = typeof d.name === 'string' && d.name.trim() ? d.name.trim() : 'Variant'

  d.sku = await generateUniqueVariantSku({
    payload: req.payload,
    productId,
    variantName: name,
    excludeVariantId: originalDoc?.id ?? null,
  })
  return data
}

/** Existing rows may have NULL before schema sync; default matches Payload `defaultValue`. */
const ensureVariantSaleDisplayMode: CollectionBeforeValidateHook = ({ data }) => {
  if (!data || typeof data !== 'object') {
    return data
  }
  const d = data as Record<string, unknown>
  if (d.saleDisplayMode == null || d.saleDisplayMode === '') {
    d.saleDisplayMode = 'inherit'
  }
  return data
}

const inheritTenantFromProductOnVariant: CollectionBeforeValidateHook = async ({ data, req }) => {
  if (!data) return data
  if (!data.tenant && data.product) {
    const productId =
      typeof data.product === 'object' ? (data.product as { id?: string }).id : data.product
    if (productId && req.payload) {
      const p = await req.payload.findByID({ collection: 'products', id: productId, depth: 0 })
      if (p?.tenant)
        data.tenant = typeof p.tenant === 'object' ? (p.tenant as { id: string }).id : p.tenant
    }
  }
  if (req.user?.role === 'vendor' && req.user.tenant && !data.tenant) {
    const tenantId = typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user.tenant
    data.tenant = tenantId
  }
  return data
}

export function createProductVariantsConfig(multivendorEnabled = false): CollectionConfig {
  const fields: CollectionConfig['fields'] = [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
    },
    { name: 'name', type: 'text', required: true },
    { name: 'sku', type: 'text', unique: true, admin: { description: 'Unique per variant. Leave empty for auto-generated.' } },
    { name: 'price', type: 'number', required: true, min: 0 },
    { name: 'compareAtPrice', type: 'number', min: 0 },
    {
      name: 'saleDisplayMode',
      type: 'select',
      required: false,
      defaultValue: 'inherit',
      options: [
        { label: 'Inherit from product', value: 'inherit' },
        { label: 'None (hide compare-at & badges)', value: 'none' },
        { label: 'Strikethrough compare-at only', value: 'strike_through' },
        { label: 'Badge: % off', value: 'badge_percent' },
        { label: 'Badge: amount saved', value: 'badge_amount' },
        { label: 'Strikethrough + badge', value: 'strike_and_badge' },
      ],
      admin: {
        description:
          'Leave empty to use the product’s sale display mode. Set to override for this SKU only.',
      },
    },
    {
      name: 'options',
      type: 'array',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'value', type: 'text', required: true },
      ],
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    { name: 'weight', type: 'number', min: 0 },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ]

  if (multivendorEnabled) {
    fields.splice(1, 0, {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      admin: { description: 'Inherited from product. Auto-set on save.' },
    })
  }

  return {
    slug: 'product-variants',
    admin: {
      useAsTitle: 'name',
      defaultColumns: multivendorEnabled
        ? ['name', 'sku', 'price', 'product', 'tenant', 'isActive']
        : ['name', 'sku', 'price', 'product', 'isActive'],
      group: 'Ecommerce',
    },
    access: {
      create: multivendorEnabled ? isAdminOrVendorOwner : isAdmin,
      read: ({ req }) => {
        if (!req.user) return { isActive: { equals: true } }
        if (req.user.role === 'admin') return true
        if (multivendorEnabled && req.user.role === 'vendor') return isAdminOrVendorOwner({ req })
        return { isActive: { equals: true } }
      },
      update: multivendorEnabled ? isAdminOrVendorOwner : isAdmin,
      delete: multivendorEnabled ? isAdminOrVendorOwner : isAdmin,
    },
    hooks: {
      beforeValidate: [
        ensureVariantSaleDisplayMode,
        ensureVariantSkuAutofill,
        ...(multivendorEnabled ? [inheritTenantFromProductOnVariant] : []),
      ],
    },
    fields,
    timestamps: true,
  }
}

/** @deprecated Use createProductVariantsConfig(multivendorEnabled) */
export const ProductVariants: CollectionConfig = createProductVariantsConfig(false)
