/**
 * Poll until the backend server is healthy, or timeout.
 *
 * Usage:
 *   import { waitForServer } from '../_helpers/wait-for-server.mjs'
 *   await waitForServer()                          // defaults: localhost:3000, 60s timeout
 *   await waitForServer({ baseUrl, timeoutMs })    // custom
 *
 * Can also run directly:
 *   node tests/_helpers/wait-for-server.mjs
 */

export async function waitForServer({
  baseUrl = process.env.BASE_URL || 'http://localhost:3000',
  timeoutMs = 60_000,
  intervalMs = 2_000,
} = {}) {
  const healthUrl = `${baseUrl.replace(/\/$/, '')}/api/users?limit=1`
  const deadline = Date.now() + timeoutMs
  let lastError = null
  let consecutiveReady = 0

  console.log(`Waiting for server at ${baseUrl} (timeout: ${timeoutMs / 1000}s)`)

  while (Date.now() < deadline) {
    try {
      const res = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      if (res.status < 500) {
        consecutiveReady += 1
        if (consecutiveReady >= 2) {
          console.log(`Server ready (${res.status})`)
          return
        }
      } else {
        consecutiveReady = 0
      }
      lastError = `status ${res.status}`
    } catch (err) {
      consecutiveReady = 0
      lastError = err instanceof Error ? err.message : String(err)
    }

    await new Promise((r) => setTimeout(r, intervalMs))
  }

  throw new Error(`Server not ready after ${timeoutMs / 1000}s. Last error: ${lastError}`)
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))
if (isMain) {
  waitForServer().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}
