import {
  type CollectionBeforeOperationHook,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
  type Payload,
  type Where,
  APIError,
} from 'payload'
import { randomBytes } from 'node:crypto'
import { isAdmin } from '../../../access/is-admin'
import { isAdminOrVendorOwner } from '../../../access/is-admin-or-vendor-owner'
import { slugField } from '../../../fields/slug'
import { getCurrencyOptions, getDefaultCurrency } from '../../../lib/currencies'
import {
  parseSpecsFromSearchParams,
  getMatchingProductIdsForSpecs,
} from '../../../lib/specifications-query'
import { productsCollectionFacetsEndpoint } from '../../../endpoints/storefront-facets'

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

export const validateClassSpecifications: CollectionBeforeValidateHook = async ({ data, req }) => {
  if (!data || typeof data !== 'object') return data
  const d = data as Record<string, unknown>
  const productClassId = toId(d.productClass)

  const specs = Array.isArray(d.specifications)
    ? (d.specifications as Array<Record<string, unknown>>)
    : []

  if (!req?.payload) return data

  try {
    let templateAttrMap = new Map<string, Record<string, unknown>>()

    if (productClassId) {
      const classDoc = (await req.payload.findByID({
        collection: 'classes',
        id: productClassId,
        depth: 2,
        overrideAccess: true,
      })) as Record<string, unknown> | null

      if (classDoc) {
        // Collect from groups.attributes
        if (Array.isArray(classDoc.groups)) {
          for (const group of classDoc.groups as Array<Record<string, unknown>>) {
            const groupName =
              typeof group.name === 'object' && group.name !== null
                ? (group.name as Record<string, string>).en || Object.values(group.name)[0] || 'General'
                : String(group.name || 'General')

            if (Array.isArray(group.attributes)) {
              for (const item of group.attributes as Array<Record<string, unknown>>) {
                const attrObj =
                  typeof item.attribute === 'object' && item.attribute !== null
                    ? (item.attribute as Record<string, unknown>)
                    : null
                const attrKey = attrObj ? String(attrObj.key || '') : ''
                if (attrKey) {
                  templateAttrMap.set(attrKey, {
                    ...attrObj,
                    group: groupName,
                    isRequired: item.isRequired,
                    displayOrder: item.displayOrder,
                  })
                }
              }
            }
          }
        }

        // Backward-compatibility: also check legacy parameters
        if (Array.isArray(classDoc.parameters)) {
          for (const param of classDoc.parameters as Array<Record<string, unknown>>) {
            if (param && param.key && !templateAttrMap.has(String(param.key))) {
              templateAttrMap.set(String(param.key), {
                ...param,
                group: 'General',
              })
            }
          }
        }
      }
    }

    // Process and clean specifications:
    // 1. Preserve ad-hoc custom specifications (isCustom: true)
    // 2. Preserve attached global attributes (isAdHoc: true or matched attribute)
    // 3. Auto-sync label, unit, and group from template definitions
    const cleanedSpecs: Array<Record<string, unknown>> = []
    const linkedAttrIds = new Set<string>()

    for (const s of specs) {
      if (!s || typeof s !== 'object') continue
      const k = String(s.key || '').trim()
      const val = s.value !== undefined && s.value !== null ? String(s.value).trim() : ''
      if (!k || val === '') continue

      const isCustom = Boolean(s.isCustom)
      const attrId = toId(s.attribute)

      if (attrId) {
        linkedAttrIds.add(String(attrId))
      }

      if (isCustom) {
        // Freeform custom specification
        cleanedSpecs.push({
          ...s,
          key: k,
          label: s.label ? String(s.label) : k,
          value: val,
          unit: s.unit ? String(s.unit) : '',
          group: s.group ? String(s.group) : 'Additional Specifications',
          isCustom: true,
          isAdHoc: false,
        })
      } else if (templateAttrMap.has(k)) {
        // Inherited from Class Template
        const tDef = templateAttrMap.get(k)!
        const tLabel =
          typeof tDef.label === 'object' && tDef.label !== null
            ? (tDef.label as Record<string, string>).en || Object.values(tDef.label)[0] || k
            : String(tDef.label || k)
        const tUnit = s.unit !== undefined && s.unit !== null && String(s.unit).trim() !== ''
          ? String(s.unit)
          : String(tDef.unit || '')
        const tGroup = s.group ? String(s.group) : String(tDef.group || 'General')

        cleanedSpecs.push({
          ...s,
          key: k,
          label: s.label ? String(s.label) : tLabel,
          value: val,
          unit: tUnit,
          group: tGroup,
          isCustom: false,
          isAdHoc: false,
        })
      } else {
        // Attached ad-hoc global attribute
        cleanedSpecs.push({
          ...s,
          key: k,
          label: s.label ? String(s.label) : k,
          value: val,
          unit: s.unit ? String(s.unit) : '',
          group: s.group ? String(s.group) : 'Additional Specifications',
          isCustom: false,
          isAdHoc: true,
        })
      }
    }

    d.specifications = cleanedSpecs

    // Validate required specs and select option constraints for published products
    const status = String(d.status ?? 'draft')
    const specValueMap = new Map<string, string>()
    for (const s of cleanedSpecs) {
      if (s.key) specValueMap.set(String(s.key), String(s.value || ''))
    }

    for (const [attrKey, attrDef] of templateAttrMap.entries()) {
      const val = specValueMap.get(attrKey) || ''

      if (status === 'published' && attrDef.isRequired && !val) {
        const paramLabel =
          typeof attrDef.label === 'object' && attrDef.label !== null
            ? (attrDef.label as Record<string, string>).en ||
              Object.values(attrDef.label)[0] ||
              attrKey
            : String(attrDef.label || attrKey)
        throw new APIError(`Required specification "${paramLabel}" is missing.`, 400)
      }

      const isSelect = attrDef.type === 'select' || attrDef.dataType === 'select'
      if (
        val &&
        isSelect &&
        Array.isArray(attrDef.options) &&
        attrDef.options.length > 0
      ) {
        const allowed = attrDef.options.map((o: Record<string, unknown>) =>
          String(o.value).toLowerCase()
        )
        if (!allowed.includes(val.toLowerCase())) {
          const paramLabel =
            typeof attrDef.label === 'object' && attrDef.label !== null
              ? (attrDef.label as Record<string, string>).en ||
                Object.values(attrDef.label)[0] ||
                attrKey
              : String(attrDef.label || attrKey)
          throw new APIError(
            `Invalid value "${val}" for specification "${paramLabel}". Allowed: ${allowed.join(', ')}`,
            400
          )
        }
      }
    }
  } catch (err: any) {
    if (err instanceof APIError || (err?.message && err.message.includes('specification'))) {
      throw err
    }
    req.payload.logger?.warn?.(`[Products beforeValidate] Notice validating specifications: ${err?.message || err}`)
  }

  return data
}

const applySpecificationFacetFilters: CollectionBeforeOperationHook = async ({
  args,
  operation,
  req,
}) => {
  if (operation === 'read' || operation === 'count' || (operation as any) === 'find') {
    try {
      const rawParams =
        (req as any)?.query ||
        (req as any)?.searchParams ||
        (req?.url ? new URL(req.url, 'http://localhost').searchParams : undefined)

      if (rawParams) {
        const { productClass, specs } = parseSpecsFromSearchParams(rawParams)
        if (productClass || Object.keys(specs).length > 0) {
          const matchingIds = await getMatchingProductIdsForSpecs(req.payload, specs, productClass)
          if (matchingIds !== undefined) {
            const idFilter: Where =
              matchingIds.length > 0
                ? { id: { in: matchingIds } }
                : { id: { equals: '00000000-0000-0000-0000-000000000000' } }

            if (args.where) {
              args.where = { and: [args.where, idFilter] }
            } else {
              args.where = idFilter
            }
          }
        }
      }
    } catch (e: any) {
      req.payload.logger?.warn(`[applySpecificationFacetFilters] Error: ${e?.message || e}`)
    }
  }
  return args
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
      name: 'brand',
      type: 'relationship',
      relationTo: 'brands',
      hasMany: false,
      admin: {
        description: 'The brand or manufacturer for this product.',
      },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
    },
    {
      name: 'productClass',
      type: 'relationship',
      relationTo: 'classes',
      hasMany: false,
      admin: {
        description:
          'Dynamic Specification Template / Class (e.g., "Power Bank", "Smartphone", "Headphones"). Products inherit defined parameters.',
      },
    },
    {
      name: 'specifications',
      type: 'array',
      labels: {
        singular: 'Specification',
        plural: 'Specifications',
      },
      admin: {
        description:
          'Structured technical specifications inherited from the assigned Product Class.',
        components: {
          Field: '/components/admin/ProductSpecificationsField',
        },
      },
      fields: [
        {
          name: 'attribute',
          type: 'relationship',
          relationTo: 'attributes',
          hasMany: false,
          admin: {
            description: 'Associated global attribute definition if linked.',
          },
        },
        { name: 'key', type: 'text', required: true },
        { name: 'label', type: 'text', required: true },
        { name: 'value', type: 'text', required: true },
        { name: 'values', type: 'json' },
        { name: 'unit', type: 'text' },
        { name: 'group', type: 'text' },
        { name: 'isCustom', type: 'checkbox', defaultValue: false },
        { name: 'isAdHoc', type: 'checkbox', defaultValue: false },
        { name: 'displayOrder', type: 'number', defaultValue: 0 },
      ],
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
        ? ['name', 'brand', 'slug', 'tenant', 'status', 'basePrice', 'currency', 'publishedAt']
        : ['name', 'brand', 'slug', 'status', 'basePrice', 'currency', 'publishedAt'],
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
        validateClassSpecifications,
        enforceBundleRules(multivendorEnabled),
      ],
      beforeOperation: [applySpecificationFacetFilters],
    },
    endpoints: [productsCollectionFacetsEndpoint],
    fields,
    timestamps: true,
  }
}

/** @deprecated Use createProductsConfig(multivendorEnabled) */
export const Products: CollectionConfig = createProductsConfig(false)
