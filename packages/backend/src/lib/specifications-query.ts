import type { Payload } from 'payload'

export interface ParsedSpecsQuery {
  productClass?: string
  specs: Record<string, string[]>
}

/**
 * Extracts specification facet filters from search parameters.
 * Supports:
 *   ?specs[capacity]=20000mah
 *   ?specs[capacity]=10000mah,20000mah
 *   ?specs.capacity=20000mah
 *   ?class=power-bank or ?productClass=uuid
 */
export function parseSpecsFromSearchParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): ParsedSpecsQuery {
  const specs: Record<string, string[]> = {}
  let productClass: string | undefined

  const entries: Array<[string, string | string[] | undefined]> =
    searchParams instanceof URLSearchParams
      ? Array.from(searchParams.entries())
      : Object.entries(searchParams)

  for (const [rawKey, rawVal] of entries) {
    if (rawVal === undefined || rawVal === null) continue

    const key = rawKey.trim()

    if (key === 'class' || key === 'productClass') {
      const v = Array.isArray(rawVal) ? rawVal[0] : rawVal
      if (v?.trim()) productClass = v.trim()
      continue
    }

    if (key === 'specs' && typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal)) {
      for (const [subKey, subVal] of Object.entries(rawVal as Record<string, unknown>)) {
        if (!subKey || subVal === undefined || subVal === null) continue
        const paramKey = subKey.trim()
        const valuesArray = Array.isArray(subVal) ? subVal : [subVal]
        const values: string[] = []
        for (const item of valuesArray) {
          if (typeof item === 'string') {
            item.split(',').forEach((val) => {
              const clean = val.trim()
              if (clean && !values.includes(clean)) {
                values.push(clean)
              }
            })
          }
        }
        if (values.length > 0) {
          if (!specs[paramKey]) specs[paramKey] = []
          for (const v of values) {
            if (!specs[paramKey].includes(v)) specs[paramKey].push(v)
          }
        }
      }
      continue
    }

    // Match specs[paramKey], specs[paramKey][], or specs.paramKey
    let paramKey: string | null = null
    const bracketMatch = key.match(/^specs\[([^\]]+)\](?:\[\])?$/)
    if (bracketMatch) {
      paramKey = bracketMatch[1].trim()
    } else if (key.startsWith('specs.')) {
      paramKey = key.slice(6).trim()
    }

    if (paramKey) {
      const valuesArray = Array.isArray(rawVal) ? rawVal : [rawVal]
      const values: string[] = []

      for (const item of valuesArray) {
        if (typeof item === 'string') {
          // Allow comma-separated values: 10000mah,20000mah
          item.split(',').forEach((val) => {
            const clean = val.trim()
            if (clean && !values.includes(clean)) {
              values.push(clean)
            }
          })
        }
      }

      if (values.length > 0) {
        if (!specs[paramKey]) {
          specs[paramKey] = []
        }
        for (const v of values) {
          if (!specs[paramKey].includes(v)) {
            specs[paramKey].push(v)
          }
        }
      }
    }
  }

  return { productClass, specs }
}

/**
 * Finds product IDs that match all specification filter constraints (AND across keys, OR within values).
 * Also filters by productClass (by UUID or slug) if provided.
 */
export async function getMatchingProductIdsForSpecs(
  payload: Payload,
  specsFilter: Record<string, string[]>,
  productClassIdOrSlug?: string
): Promise<string[] | undefined> {
  const specKeys = Object.keys(specsFilter).filter((k) => specsFilter[k].length > 0)

  // If no specs and no class filter, no product ID filtering needed
  if (specKeys.length === 0 && !productClassIdOrSlug) {
    return undefined
  }

  // Resolve productClass ID if slug was passed
  let resolvedClassId: string | undefined = productClassIdOrSlug
  if (productClassIdOrSlug) {
    try {
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productClassIdOrSlug)
      if (!isUUID) {
        const { docs } = await payload.find({
          collection: 'classes',
          where: { slug: { equals: productClassIdOrSlug } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
        if (docs.length > 0) {
          resolvedClassId = String(docs[0].id)
        }
      }
    } catch {
      // ignore
    }
  }

  // Attempt database query via Drizzle SQL when available
  const db = (payload.db as any)?.drizzle || (payload.db as any)
  if (db && typeof db.execute === 'function') {
    try {
      const { sql } = await import('@payloadcms/db-postgres')

      let candidateIds: Set<string> | null = null

      if (resolvedClassId) {
        const classRows = await db.execute(sql`
          SELECT id FROM "products" WHERE "product_class_id" = ${resolvedClassId}::uuid
        `)
        const classIds = new Set<string>()
        const rows = classRows.rows || classRows
        for (const r of rows) {
          classIds.add(String(r.id))
        }
        candidateIds = classIds
        if (candidateIds.size === 0) return []
      }

      for (const key of specKeys) {
        const vals = specsFilter[key]
        if (vals.length === 0) continue

        // Query product IDs having this spec key and any of the values
        const valSqls = vals.map((v) => sql`${v}`)
        const specRows = await db.execute(sql`
          SELECT DISTINCT "_parent_id" AS id
          FROM "products_specifications"
          WHERE "key" = ${key} AND "value" = ANY(ARRAY[${sql.join(valSqls, sql`, `)}])
        `)

        const matchingForThisKey = new Set<string>()
        const rows = specRows.rows || specRows
        for (const r of rows) {
          matchingForThisKey.add(String(r.id))
        }

        if (candidateIds === null) {
          candidateIds = matchingForThisKey
        } else {
          // Intersect
          const next = new Set<string>()
          for (const id of Array.from(candidateIds)) {
            if (matchingForThisKey.has(id)) next.add(id)
          }
          candidateIds = next
        }

        if (candidateIds.size === 0) return []
      }

      return candidateIds !== null ? Array.from(candidateIds) : undefined
    } catch (e: any) {
      payload.logger?.warn?.(`[SpecificationsQuery] SQL query notice: ${e?.message || e}. Using fallback.`)
    }
  }

  // Fallback using Payload find
  try {
    const where: any = {}
    if (resolvedClassId) {
      where.productClass = { equals: resolvedClassId }
    }

    const { docs } = await payload.find({
      collection: 'products',
      where,
      limit: 5000,
      depth: 0,
      overrideAccess: true,
    })

    const matchingIds: string[] = []
    for (const doc of docs) {
      const specs = (doc as any).specifications as Array<{ key: string; value: string }> | undefined
      if (!specs || !Array.isArray(specs)) continue

      let allKeysMatch = true
      for (const key of specKeys) {
        const vals = specsFilter[key]
        const hasMatch = specs.some(
          (s) => s.key === key && vals.some((v) => v.toLowerCase() === String(s.value).toLowerCase())
        )
        if (!hasMatch) {
          allKeysMatch = false
          break
        }
      }

      if (allKeysMatch) {
        matchingIds.push(String(doc.id))
      }
    }

    return matchingIds
  } catch {
    return undefined
  }
}
