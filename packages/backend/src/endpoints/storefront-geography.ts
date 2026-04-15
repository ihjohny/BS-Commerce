/**
 * Public storefront geography APIs (no auth).
 *
 * Query params use global-neutral names: subdivisionId, localityId.
 * Legacy aliases: districtId→subdivisionId, upazilaId→localityId (deprecated).
 *
 * Optional: `onlyWithPublicStoreCoverage=true` on **subdivisions** and **localities** lists only
 * regions/localities that have at least one active public stock location serving them
 * (via `stock-location-service-areas`). Omitted / false returns all active geo rows (admin/catalog mode).
 *
 * GET /api/storefront/geography?resource=countries
 * GET /api/storefront/geography?resource=subdivisions&countryId=
 * GET /api/storefront/geography?resource=subdivisions&countryId=&onlyWithPublicStoreCoverage=true
 * GET /api/storefront/geography?resource=localities&subdivisionId=
 * GET /api/storefront/geography?resource=localities&subdivisionId=&onlyWithPublicStoreCoverage=true
 * GET /api/storefront/geography?resource=delivery-context&subdivisionId=&localityId=
 *
 * Legacy resource names: districts (=subdivisions), upazilas (=localities).
 *
 * Requires GEOGRAPHY_ENABLED=true and geography plugin registered.
 */
import type { Endpoint, PayloadRequest, Where } from 'payload'

function relationId(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return String((value as { id: unknown }).id)
  }
  return null
}

async function getActivePublicStoreIds(req: PayloadRequest): Promise<string[]> {
  const { docs } = await req.payload.find({
    collection: 'stock-locations',
    where: {
      and: [{ isPublicStore: { equals: true } }, { isActive: { equals: true } }],
    },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })
  return docs.map((d) => String(d.id))
}

async function getSubdivisionIdsServedByPublicStores(req: PayloadRequest): Promise<Set<string>> {
  const stockIds = await getActivePublicStoreIds(req)
  if (stockIds.length === 0) return new Set()
  const { docs: areas } = await req.payload.find({
    collection: 'stock-location-service-areas',
    where: { stockLocation: { in: stockIds } },
    limit: 10_000,
    depth: 0,
    overrideAccess: true,
  })
  const out = new Set<string>()
  for (const row of areas) {
    const sid = relationId((row as { subdivision?: unknown }).subdivision)
    if (sid) out.add(sid)
  }
  return out
}

type ServedLocalitiesResult =
  | { kind: 'all' }
  | { kind: 'ids'; ids: Set<string> }

async function getServedLocalitiesInSubdivision(
  req: PayloadRequest,
  subdivisionId: string,
  stockIds: string[],
): Promise<ServedLocalitiesResult> {
  if (stockIds.length === 0) return { kind: 'ids', ids: new Set() }
  const { docs: areas } = await req.payload.find({
    collection: 'stock-location-service-areas',
    where: {
      and: [{ stockLocation: { in: stockIds } }, { subdivision: { equals: subdivisionId } }],
    },
    limit: 10_000,
    depth: 0,
    overrideAccess: true,
  })
  let wholeSubdivision = false
  const ids = new Set<string>()
  for (const row of areas) {
    const lid = relationId((row as { locality?: unknown }).locality)
    if (lid == null || lid === '') wholeSubdivision = true
    else ids.add(lid)
  }
  if (wholeSubdivision) return { kind: 'all' }
  return { kind: 'ids', ids }
}

function parseOnlyServedFlag(url: URL): boolean {
  const v =
    url.searchParams.get('onlyWithPublicStoreCoverage') ?? url.searchParams.get('onlyServed')
  return v === 'true' || v === '1'
}

export function isGeographyFeatureEnabled(): boolean {
  return process.env.GEOGRAPHY_ENABLED === 'true'
}

type ServiceTier = 'standard' | 'extended' | 'unserved'

function policyFromSubdivision(d: Record<string, unknown> | undefined) {
  if (!d) {
    return {
      tier: 'standard' as ServiceTier,
      extendedFeeNote: null as string | null,
      extendedLeadTimeNote: null as string | null,
      unservedCustomerMessage: null as string | null,
    }
  }
  return {
    tier: (d.defaultServiceTier as ServiceTier) || 'standard',
    extendedFeeNote: (d.extendedFeeNote as string) || null,
    extendedLeadTimeNote: (d.extendedLeadTimeNote as string) || null,
    unservedCustomerMessage: (d.unservedCustomerMessage as string) || null,
  }
}

function policyFromLocality(u: Record<string, unknown> | undefined) {
  if (!u) {
    return {
      tier: 'standard' as ServiceTier,
      extendedFeeNote: null as string | null,
      extendedLeadTimeNote: null as string | null,
      unservedCustomerMessage: null as string | null,
    }
  }
  return {
    tier: (u.serviceTier as ServiceTier) || 'standard',
    extendedFeeNote: (u.extendedFeeNote as string) || null,
    extendedLeadTimeNote: (u.extendedLeadTimeNote as string) || null,
    unservedCustomerMessage: (u.unservedCustomerMessage as string) || null,
  }
}

function normalizeResource(raw: string | null): string {
  const r = raw ?? 'delivery-context'
  if (r === 'districts') return 'subdivisions'
  if (r === 'upazilas') return 'localities'
  return r
}

export const storefrontGeographyEndpoint: Endpoint = {
  path: '/storefront/geography',
  method: 'get',
  handler: async (req) => {
    if (!isGeographyFeatureEnabled()) {
      return Response.json({ error: 'Geography feature is not enabled' }, { status: 404 })
    }

    const url = new URL(req.url ?? '', 'http://localhost')
    const resource = normalizeResource(url.searchParams.get('resource'))

    const subdivisionIdParam =
      url.searchParams.get('subdivisionId')?.trim() ||
      url.searchParams.get('districtId')?.trim() ||
      undefined
    const localityIdParam =
      url.searchParams.get('localityId')?.trim() ||
      url.searchParams.get('upazilaId')?.trim() ||
      undefined

    try {
      if (resource === 'countries') {
        const { docs } = await req.payload.find({
          collection: 'geo-countries',
          where: { isActive: { equals: true } },
          sort: 'name',
          limit: 200,
          depth: 0,
          overrideAccess: true,
        })

        return Response.json({
          docs: docs.map((d) => ({
            id: d.id,
            name: (d as { name?: string }).name,
            isoCode: (d as { isoCode?: string }).isoCode,
          })),
        })
      }

      if (resource === 'subdivisions') {
        const countryId = url.searchParams.get('countryId')
        if (!countryId?.trim()) {
          return Response.json({ error: 'countryId is required' }, { status: 400 })
        }

        const onlyServed = parseOnlyServedFlag(url)

        let { docs } = await req.payload.find({
          collection: 'geo-subdivisions',
          where: {
            and: [{ country: { equals: countryId.trim() } }, { isActive: { equals: true } }],
          },
          sort: 'name',
          limit: 1000,
          depth: 0,
          overrideAccess: true,
        })

        if (onlyServed) {
          const served = await getSubdivisionIdsServedByPublicStores(req)
          docs = docs.filter((d) => served.has(String(d.id)))
        }

        return Response.json({
          docs: docs.map((d) => ({
            id: d.id,
            name: (d as { name?: string }).name,
            code: (d as { code?: string }).code ?? null,
            defaultServiceTier: (d as { defaultServiceTier?: string }).defaultServiceTier,
          })),
        })
      }

      if (resource === 'localities') {
        const subId =
          url.searchParams.get('subdivisionId')?.trim() ||
          url.searchParams.get('districtId')?.trim() ||
          ''
        if (!subId) {
          return Response.json({ error: 'subdivisionId is required' }, { status: 400 })
        }

        const onlyServed = parseOnlyServedFlag(url)

        let { docs } = await req.payload.find({
          collection: 'geo-localities',
          where: {
            and: [{ subdivision: { equals: subId } }, { isActive: { equals: true } }],
          },
          sort: 'name',
          limit: 5000,
          depth: 0,
          overrideAccess: true,
        })

        if (onlyServed) {
          const stockIds = await getActivePublicStoreIds(req)
          const served = await getServedLocalitiesInSubdivision(req, subId, stockIds)
          if (served.kind === 'ids') {
            docs = docs.filter((d) => served.ids.has(String(d.id)))
          }
        }

        return Response.json({
          docs: docs.map((d) => ({
            id: d.id,
            name: (d as { name?: string }).name,
            code: (d as { code?: string }).code ?? null,
            serviceTier: (d as { serviceTier?: string }).serviceTier,
          })),
        })
      }

      if (resource === 'delivery-context') {
        if (!subdivisionIdParam) {
          return Response.json({ error: 'subdivisionId is required' }, { status: 400 })
        }

        const subdivisionDoc = await req.payload.findByID({
          collection: 'geo-subdivisions',
          id: subdivisionIdParam,
          depth: 0,
          overrideAccess: true,
        })

        let localityDoc: Record<string, unknown> | null = null
        if (localityIdParam) {
          localityDoc = (await req.payload.findByID({
            collection: 'geo-localities',
            id: localityIdParam,
            depth: 0,
            overrideAccess: true,
          })) as Record<string, unknown> | null

          if (localityDoc?.subdivision) {
            const sid =
              typeof localityDoc.subdivision === 'object' && localityDoc.subdivision !== null
                ? (localityDoc.subdivision as { id?: string }).id
                : String(localityDoc.subdivision)
            if (sid !== subdivisionIdParam) {
              return Response.json(
                { error: 'localityId does not belong to the given subdivisionId' },
                { status: 400 },
              )
            }
          }
        }

        const policy = localityDoc
          ? policyFromLocality(localityDoc)
          : policyFromSubdivision(subdivisionDoc as Record<string, unknown> | undefined)

        const serviceWhere: Where = {
          and: [{ subdivision: { equals: subdivisionIdParam } }],
        }

        if (localityIdParam) {
          serviceWhere.and!.push({
            or: [{ locality: { equals: localityIdParam } }, { locality: { exists: false } }],
          })
        }

        const { docs: areaRows } = await req.payload.find({
          collection: 'stock-location-service-areas',
          where: serviceWhere,
          limit: 10_000,
          depth: 0,
          overrideAccess: true,
        })

        const stockIds = new Set<string>()
        for (const row of areaRows) {
          const ref = (row as { stockLocation?: unknown }).stockLocation
          const sid =
            typeof ref === 'object' && ref !== null && 'id' in ref
              ? String((ref as { id: string }).id)
              : ref != null
                ? String(ref)
                : null
          if (sid) stockIds.add(sid)
        }

        let stores: Record<string, unknown>[] = []
        if (stockIds.size > 0) {
          const { docs: locs } = await req.payload.find({
            collection: 'stock-locations',
            where: {
              and: [
                { id: { in: Array.from(stockIds) } },
                { isPublicStore: { equals: true } },
                { isActive: { equals: true } },
              ],
            },
            limit: 500,
            depth: 0,
            overrideAccess: true,
          })
          stores = locs as Record<string, unknown>[]
          stores.sort((a, b) => {
            const pa = Number(a.sortPriority) || 0
            const pb = Number(b.sortPriority) || 0
            if (pa !== pb) return pa - pb
            const na = String(a.name ?? '')
            const nb = String(b.name ?? '')
            return na.localeCompare(nb)
          })
        }

        let emptyReason: 'none' | 'no_public_stores_for_area' | 'unserved_area' = 'none'
        if (policy.tier === 'unserved') {
          emptyReason = 'unserved_area'
        } else if (stores.length === 0) {
          emptyReason = 'no_public_stores_for_area'
        }

        return Response.json({
          policy: {
            tier: policy.tier,
            extendedFeeNote: policy.extendedFeeNote,
            extendedLeadTimeNote: policy.extendedLeadTimeNote,
            unservedCustomerMessage: policy.unservedCustomerMessage,
          },
          subdivision: subdivisionDoc
            ? {
                id: subdivisionDoc.id,
                name: (subdivisionDoc as { name?: string }).name,
              }
            : null,
          locality: localityDoc
            ? {
                id: localityDoc.id,
                name: (localityDoc as { name?: string }).name,
              }
            : null,
          stores: stores.map((s) => ({
            id: s.id,
            name: s.name,
            slug: s.slug ?? null,
            code: s.code,
            sortPriority: s.sortPriority ?? 0,
            tenant: s.tenant ?? null,
            address: s.address ?? null,
          })),
          emptyReason,
        })
      }

      return Response.json({ error: 'Unknown resource' }, { status: 400 })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed'
      return Response.json({ error: msg }, { status: 500 })
    }
  },
}
