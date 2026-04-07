import type { Endpoint } from 'payload'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'
import { customEndpointsOpenApi } from '../lib/custom-endpoints-openapi'

function getBaseUrl(req: Request): string {
  try {
    return new URL(req.url).origin
  } catch {
    return 'http://localhost:3000'
  }
}

function readLegacyOpenApi(): Record<string, unknown> | null {
  try {
    const currentFile = fileURLToPath(import.meta.url)
    const backendRoot = path.resolve(path.dirname(currentFile), '..', '..')
    const legacyPath = path.resolve(backendRoot, '..', '..', '..', 'docs', 'openapi.yaml')
    if (!fs.existsSync(legacyPath)) return null
    const raw = fs.readFileSync(legacyPath, 'utf8')
    const parsed = YAML.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function normalizeLegacyPaths(paths: Record<string, Record<string, unknown>>): Record<string, Record<string, unknown>> {
  const normalized: Record<string, Record<string, unknown>> = {}
  for (const [rawPath, operations] of Object.entries(paths)) {
    const normalizedPath = rawPath.startsWith('/api/') ? rawPath : `/api${rawPath}`
    normalized[normalizedPath] = operations
  }
  return normalized
}

function mergePathOperations(
  customPaths: Record<string, Record<string, unknown>>,
  legacyPaths: Record<string, Record<string, unknown>>,
  generatedPaths: Record<string, Record<string, unknown>>,
): Record<string, Record<string, unknown>> {
  const keys = new Set([...Object.keys(customPaths), ...Object.keys(legacyPaths), ...Object.keys(generatedPaths)])
  const merged: Record<string, Record<string, unknown>> = {}
  for (const pathKey of keys) {
    merged[pathKey] = {
      ...(customPaths[pathKey] || {}),
      ...(legacyPaths[pathKey] || {}),
      ...(generatedPaths[pathKey] || {}),
    }
  }
  return merged
}

/**
 * Unified OpenAPI document for Swagger UI:
 * - payload-oapi generated spec (`/api/openapi.json`)
 * - supplemental missing endpoints (`customEndpointsOpenApi.paths`)
 */
export const openapiAllEndpoint: Endpoint = {
  path: '/openapi-all.json',
  method: 'get',
  handler: async (req) => {
    const baseUrl = getBaseUrl(req as unknown as Request)
    const generatedUrl = `${baseUrl}/api/openapi.json`

    try {
      const generated = await fetch(generatedUrl, {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      }).then((r) => r.json())

      const legacy = readLegacyOpenApi()
      const generatedPaths = ((generated.paths as Record<string, Record<string, unknown>>) || {}) as Record<
        string,
        Record<string, unknown>
      >
      const legacyRawPaths = ((legacy?.paths as Record<string, Record<string, unknown>>) || {}) as Record<
        string,
        Record<string, unknown>
      >
      const legacyPaths = normalizeLegacyPaths(legacyRawPaths)
      const customPaths = customEndpointsOpenApi.paths as Record<string, Record<string, unknown>>

      const merged = {
        ...generated,
        info: {
          ...(generated.info || {}),
          title: generated.info?.title || 'BS-Commerce Backend API',
        },
        // Priority: generated (most accurate runtime shape) > legacy yaml > custom supplemental.
        paths: mergePathOperations(customPaths, legacyPaths, generatedPaths),
        components: {
          ...((legacy?.components as Record<string, unknown>) || {}),
          ...((generated.components as Record<string, unknown>) || {}),
        },
      }

      return Response.json(merged, {
        status: 200,
        headers: { 'cache-control': 'no-store' },
      })
    } catch {
      // Fallback keeps docs available even if generated spec route is temporarily unavailable.
      return Response.json(customEndpointsOpenApi, {
        status: 200,
        headers: { 'cache-control': 'no-store' },
      })
    }
  },
}

