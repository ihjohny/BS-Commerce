import type { Endpoint, Where } from 'payload'

export interface FacetOptionResult {
  value: string
  label: string
  count: number
}

export interface FacetGroupResult {
  classId: string
  className: string
  classSlug: string
  key: string
  label: string
  type: string
  unit?: string | null
  displayOrder: number
  options: FacetOptionResult[]
}

export interface ClassFacetsResult {
  id: string
  name: string
  slug: string
  description?: string
  parameters: Array<{
    key: string
    label: string
    type: string
    unit?: string | null
    isFilterable: boolean
    isRequired: boolean
    displayOrder: number
    options: FacetOptionResult[]
  }>
}

export async function aggregateCatalogFacets(
  payload: any,
  options: {
    category?: string
    productClass?: string
    storeId?: string
    locale?: string
  }
): Promise<{ classes: ClassFacetsResult[]; facets: FacetGroupResult[] }> {
  const { category, productClass, storeId, locale = 'en' } = options

  // 1. Resolve store stock filter if storeId is provided
  let storeProductIds: string[] | undefined
  if (storeId) {
    const { docs: stockRows } = await payload.find({
      collection: 'stock-levels',
      where: { location: { equals: storeId } },
      limit: 10_000,
      depth: 0,
      overrideAccess: true,
    })

    const availableIds = new Set<string>()
    for (const row of stockRows) {
      const qty = Number(row.quantity) || 0
      const reserved = Number(row.reservedQuantity) || 0
      if (qty - reserved > 0) {
        const pRef = row.product
        const pid = typeof pRef === 'object' && pRef !== null ? pRef.id : String(pRef)
        if (pid) availableIds.add(pid)
      }
    }
    storeProductIds = Array.from(availableIds)
    if (storeProductIds.length === 0) {
      return { classes: [], facets: [] }
    }
  }

  // 2. Resolve category ID if a slug was given
  let resolvedCategoryId = category
  if (category) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category)
    if (!isUUID) {
      const { docs: catDocs } = await payload.find({
        collection: 'categories',
        where: { slug: { equals: category } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (catDocs.length > 0) {
        resolvedCategoryId = String(catDocs[0].id)
      }
    }
  }

  // 3. Resolve class ID if a slug was given
  let resolvedClassId = productClass
  if (productClass) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productClass)
    if (!isUUID) {
      const { docs: classDocs } = await payload.find({
        collection: 'classes',
        where: { slug: { equals: productClass } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (classDocs.length > 0) {
        resolvedClassId = String(classDocs[0].id)
      }
    }
  }

  // 4. Query published products in this catalog scope
  const andClauses: Where[] = [{ status: { equals: 'published' } }]

  if (storeProductIds) {
    andClauses.push({ id: { in: storeProductIds } })
  }
  if (resolvedCategoryId) {
    andClauses.push({ categories: { in: [resolvedCategoryId] } })
  }
  if (resolvedClassId) {
    andClauses.push({ productClass: { equals: resolvedClassId } })
  }

  const where: Where = andClauses.length === 1 ? andClauses[0] : { and: andClauses }

  const { docs: products } = await payload.find({
    collection: 'products',
    where,
    limit: 5000,
    depth: 0,
    overrideAccess: true,
    locale,
  })

  // 5. Collect all unique class IDs referenced by these products
  const classIdsInScope = new Set<string>()
  for (const prod of products) {
    const pClass = (prod as any).productClass
    const cid = typeof pClass === 'object' && pClass !== null ? pClass.id : pClass
    if (cid) classIdsInScope.add(String(cid))
  }

  if (classIdsInScope.size === 0) {
    // If no products have a class yet, check if a specific class was requested
    if (resolvedClassId) {
      classIdsInScope.add(resolvedClassId)
    } else {
      return { classes: [], facets: [] }
    }
  }

  // 6. Fetch all class definitions in scope
  const { docs: classesDocs } = await payload.find({
    collection: 'classes',
    where: { id: { in: Array.from(classIdsInScope) } },
    limit: 100,
    depth: 1,
    overrideAccess: true,
    locale,
  })

  const classMap = new Map<string, any>()
  for (const c of classesDocs) {
    classMap.set(String(c.id), c)
  }

  // 7. Tally specification values per class and parameter
  // countsMap: classId -> paramKey -> value -> count
  const countsMap = new Map<string, Map<string, Map<string, number>>>()

  for (const prod of products) {
    const pClass = (prod as any).productClass
    const cid = String(typeof pClass === 'object' && pClass !== null ? pClass.id : pClass)
    if (!cid || !classMap.has(cid)) continue

    if (!countsMap.has(cid)) {
      countsMap.set(cid, new Map())
    }
    const classCounts = countsMap.get(cid)!

    const specs = (prod as any).specifications as Array<{ key: string; value: string }> | undefined
    if (specs && Array.isArray(specs)) {
      for (const spec of specs) {
        if (!spec.key || spec.value === undefined || spec.value === null) continue
        const k = spec.key
        const v = String(spec.value).trim()
        if (!v) continue

        if (!classCounts.has(k)) {
          classCounts.set(k, new Map())
        }
        const valMap = classCounts.get(k)!
        valMap.set(v, (valMap.get(v) || 0) + 1)
      }
    }
  }

  // 8. Build response
  const classesResult: ClassFacetsResult[] = []
  const facetsResult: FacetGroupResult[] = []

  for (const c of classesDocs) {
    const cid = String(c.id)
    const classCounts = countsMap.get(cid) || new Map()
    const rawParams = Array.isArray(c.parameters) ? c.parameters : []

    const formattedParams: ClassFacetsResult['parameters'] = []

    for (const param of rawParams) {
      if (param.isFilterable === false) continue

      const paramKey = param.key
      const valCounts = classCounts.get(paramKey) || new Map()

      let optionsList: FacetOptionResult[] = []

      if (param.type === 'select' && Array.isArray(param.options)) {
        // Predefined options
        for (const opt of param.options) {
          const optVal = String(opt.value)
          const optLabel = typeof opt.label === 'object' ? opt.label?.[locale] || opt.label?.en || optVal : String(opt.label || optVal)
          const count = valCounts.get(optVal) || 0
          optionsList.push({
            value: optVal,
            label: optLabel,
            count,
          })
        }
      } else {
        // Dynamic values from products
        for (const [val, count] of valCounts.entries()) {
          optionsList.push({
            value: val,
            label: val,
            count,
          })
        }
        optionsList.sort((a, b) => b.count - a.count)
      }

      // Filter to options that have products in scope, or keep all predefined options if class was explicitly selected
      if (!resolvedClassId) {
        optionsList = optionsList.filter((o) => o.count > 0)
      }

      if (optionsList.length > 0) {
        const paramLabel =
          typeof param.label === 'object' ? param.label?.[locale] || param.label?.en || paramKey : String(param.label || paramKey)

        formattedParams.push({
          key: paramKey,
          label: paramLabel,
          type: param.type || 'text',
          unit: param.unit || null,
          isFilterable: true,
          isRequired: Boolean(param.isRequired),
          displayOrder: Number(param.displayOrder) || 0,
          options: optionsList,
        })

        facetsResult.push({
          classId: cid,
          className: typeof c.name === 'object' ? c.name?.[locale] || c.name?.en || c.slug : String(c.name || c.slug),
          classSlug: c.slug,
          key: paramKey,
          label: paramLabel,
          type: param.type || 'text',
          unit: param.unit || null,
          displayOrder: Number(param.displayOrder) || 0,
          options: optionsList,
        })
      }
    }

    if (formattedParams.length > 0 || resolvedClassId === cid) {
      classesResult.push({
        id: cid,
        name: typeof c.name === 'object' ? c.name?.[locale] || c.name?.en || c.slug : String(c.name || c.slug),
        slug: c.slug,
        description: typeof c.description === 'object' ? c.description?.[locale] || c.description?.en : c.description,
        parameters: formattedParams,
      })
    }
  }

  // Sort facets by displayOrder
  facetsResult.sort((a, b) => a.displayOrder - b.displayOrder)

  return { classes: classesResult, facets: facetsResult }
}

export const storefrontFacetsEndpoint: Endpoint = {
  path: '/storefront/facets',
  method: 'get',
  handler: async (req) => {
    const url = new URL(req.url ?? '', 'http://localhost')
    const qs = url.searchParams

    const category = qs.get('category') ?? undefined
    const productClass = qs.get('class') ?? qs.get('productClass') ?? undefined
    const storeId = qs.get('store') ?? undefined
    const locale = qs.get('locale') ?? 'en'

    try {
      const data = await aggregateCatalogFacets(req.payload, {
        category,
        productClass,
        storeId,
        locale,
      })

      return Response.json(data, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      })
    } catch (err: any) {
      req.payload.logger?.error(`[Storefront Facets Endpoint] ${err?.message || err}`)
      return Response.json({ error: 'Failed to aggregate facets' }, { status: 500 })
    }
  },
}

export const productsFacetsEndpoint: Endpoint = {
  path: '/products/facets',
  method: 'get',
  handler: storefrontFacetsEndpoint.handler,
}

export const productsCollectionFacetsEndpoint = {
  path: '/facets',
  method: 'get' as const,
  handler: storefrontFacetsEndpoint.handler,
}
