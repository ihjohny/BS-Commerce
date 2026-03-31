/**
 * Shared utilities for live-API (E2E) test scripts.
 *
 * Usage:
 *   import { createClient } from '../_helpers/live-api-client.mjs'
 *   const { request, ok, fail, skip, summary, printSummary } = createClient({ verbose: true })
 */

export function createClient({
  baseUrl = process.env.BASE_URL || 'http://localhost:3000',
  verbose = process.env.VERBOSE === 'true',
} = {}) {
  const apiBase = `${baseUrl.replace(/\/$/, '')}/api`
  const results = []
  const suiteIp = `10.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`

  function ok(name, detail = '') {
    results.push({ name, ok: true, detail })
    console.log(`  PASS ${name}${detail ? ` - ${detail}` : ''}`)
  }

  function fail(name, detail = '') {
    results.push({ name, ok: false, detail })
    console.error(`  FAIL ${name}${detail ? ` - ${detail}` : ''}`)
  }

  function skip(name, detail = '') {
    results.push({ name, ok: true, skipped: true, detail })
    console.log(`  SKIP ${name}${detail ? ` - ${detail}` : ''}`)
  }

  function logStep(name) {
    console.log(`\n[STEP] ${name}`)
  }

  async function request(path, { method = 'GET', headers = {}, body } = {}) {
    const reqHeaders = { ...headers }
    if (!reqHeaders['x-forwarded-for'] && !reqHeaders['X-Forwarded-For']) {
      reqHeaders['x-forwarded-for'] = suiteIp
    }
    let reqBody
    if (body !== undefined) {
      reqHeaders['Content-Type'] = reqHeaders['Content-Type'] || 'application/json'
      reqBody = typeof body === 'string' ? body : JSON.stringify(body)
    }

    const res = await fetch(`${apiBase}${path}`, {
      method,
      headers: reqHeaders,
      body: reqBody,
    })

    const text = await res.text()
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }

    if (verbose) {
      console.log(`    ${method} ${path} -> ${res.status}`)
      if (text) console.log(`    body: ${text.slice(0, 500)}`)
    }

    return { res, status: res.status, json, text, headers: res.headers }
  }

  function printSummary(suiteName = 'Test') {
    const failed = results.filter((x) => !x.ok)
    const skipped = results.filter((x) => x.skipped)
    const passed = results.length - failed.length - skipped.length
    console.log(`\n=== ${suiteName} summary ===`)
    for (const row of results) {
      const label = row.skipped ? 'SKIP' : row.ok ? 'PASS' : 'FAIL'
      console.log(`${label} - ${row.name}${row.detail ? ` (${row.detail})` : ''}`)
    }
    console.log(`\nTotal: ${results.length}, Passed: ${passed}, Skipped: ${skipped.length}, Failed: ${failed.length}`)
    return failed.length
  }

  return { apiBase, request, ok, fail, skip, logStep, results, printSummary }
}
