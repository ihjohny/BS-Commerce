/**
 * Automated test data lifecycle manager.
 *
 * Creates test entities via the REST API and tracks them for cleanup.
 * Every entity created through this manager is automatically deleted
 * when cleanup() is called.
 *
 * Usage:
 *   import { TestDataManager } from '../_helpers/test-data-manager.mjs'
 *   const dm = new TestDataManager({ adminToken: '...' })
 *   const user = await dm.createUser({ email: 'test@example.com', password: 'Test1234!' })
 *   const product = await dm.createProduct({ name: 'Widget', basePrice: 10 })
 *   // ... run tests ...
 *   await dm.cleanup()   // deletes everything in reverse order
 */

import crypto from 'node:crypto'

export class TestDataManager {
  #apiBase
  #adminToken
  #created = []
  #verbose

  constructor({ apiBase, adminToken, verbose = false }) {
    this.#apiBase = apiBase || `${(process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')}/api`
    this.#adminToken = adminToken
    this.#verbose = verbose
  }

  get adminToken() {
    return this.#adminToken
  }

  set adminToken(token) {
    this.#adminToken = token
  }

  async #request(path, { method = 'GET', headers = {}, body, token } = {}) {
    const h = { ...headers }
    if (token || this.#adminToken) {
      h['Authorization'] = `Bearer ${token || this.#adminToken}`
    }
    let reqBody
    if (body !== undefined) {
      h['Content-Type'] = h['Content-Type'] || 'application/json'
      reqBody = typeof body === 'string' ? body : JSON.stringify(body)
    }

    const url = `${this.#apiBase}${path}`
    if (this.#verbose) console.log(`  [DM] ${method} ${path}`)

    const res = await fetch(url, { method, headers: h, body: reqBody })
    const text = await res.text()
    let json = null
    try { json = text ? JSON.parse(text) : null } catch { json = null }

    if (this.#verbose && res.status >= 400) {
      console.log(`  [DM] ${res.status}: ${text.slice(0, 300)}`)
    }

    return { status: res.status, json, text }
  }

  #track(collection, id) {
    if (id) this.#created.push({ collection, id })
  }

  #uid() {
    return `test-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  }

  /**
   * Bootstrap the first admin user via Payload's create-first-user.
   * If users already exist, logs in with the provided credentials instead.
   * Ensures the admin has emailVerified=true to pass verification gates.
   */
  async bootstrapAdmin({ email, password }) {
    const firstUser = await this.#request('/users/first-register', {
      method: 'POST',
      body: {
        email,
        password,
        role: 'admin',
        status: 'active',
        emailVerified: true,
      },
    })

    if (firstUser.status === 200 || firstUser.status === 201) {
      const token = firstUser.json?.token || firstUser.json?.user?.token
      const userId = firstUser.json?.user?.id || firstUser.json?.id
      if (token) {
        this.#adminToken = token
        // Ensure emailVerified is set (first-register might not honor it)
        if (userId) {
          await this.#request(`/users/${userId}`, {
            method: 'PATCH',
            body: { emailVerified: true },
          })
        }
        return { email, token, created: true }
      }
    }

    // Try standard login endpoints
    const login = await this.#request('/users/login', {
      method: 'POST',
      body: { email, password },
    })
    if (login.status === 200 && login.json?.token) {
      this.#adminToken = login.json.token
      // Ensure admin is verified
      await this.#ensureAdminVerified(email)
      return { email, token: login.json.token, created: false }
    }

    const loginAlt = await this.#request('/auth/login', {
      method: 'POST',
      body: { identifier: email, password },
    })
    if (loginAlt.status === 200 && loginAlt.json?.token) {
      this.#adminToken = loginAlt.json.token
      return { email, token: loginAlt.json.token, created: false }
    }

    // Login might fail due to verification gate - try to verify admin first
    // Find admin user and verify them
    const verified = await this.#tryVerifyExistingAdmin(email, password)
    if (verified) {
      return { email, token: this.#adminToken, created: false }
    }

    throw new Error(
      `Failed to bootstrap admin. first-register=${firstUser.status}, login=${login.status}, auth/login=${loginAlt.status}`
    )
  }

  async #ensureAdminVerified(email) {
    // Find the user by email
    const users = await this.#request(`/users?where[email][equals]=${encodeURIComponent(email)}&limit=1`)
    if (users.status === 200 && users.json?.docs?.[0]) {
      const userId = users.json.docs[0].id
      await this.#request(`/users/${userId}`, {
        method: 'PATCH',
        body: { emailVerified: true },
      })
    }
  }

  async #tryVerifyExistingAdmin(email, password) {
    // First try to find and verify the user via first-register token or direct API
    // This is a fallback when login fails due to verification gate
    const users = await this.#request(`/users?where[email][equals]=${encodeURIComponent(email)}&limit=1`)
    
    if (users.status !== 200 || !users.json?.docs?.[0]) {
      return false
    }
    
    const userId = users.json.docs[0].id
    
    // Try to update emailVerified without auth (might work for first user)
    const update = await this.#request(`/users/${userId}`, {
      method: 'PATCH',
      body: { emailVerified: true },
    })
    
    if (update.status === 200 || update.status === 201) {
      // Now try login again
      const login = await this.#request('/auth/login', {
        method: 'POST',
        body: { identifier: email, password },
      })
      if (login.status === 200 && login.json?.token) {
        this.#adminToken = login.json.token
        return true
      }
    }
    
    return false
  }

  async createUser(overrides = {}) {
    const uid = this.#uid()
    const data = {
      email: `${uid}@test.local`,
      password: 'TestPass1234!',
      firstName: 'Test',
      lastName: 'User',
      ...overrides,
    }

    const res = await this.#request('/users', { method: 'POST', body: data })
    if (![200, 201].includes(res.status)) {
      throw new Error(`createUser failed (${res.status}): ${res.text.slice(0, 300)}`)
    }
    const doc = res.json?.doc || res.json
    this.#track('users', doc?.id)
    return { ...doc, password: data.password }
  }

  async loginUser({ email, password }) {
    const res = await this.#request('/auth/login', {
      method: 'POST',
      body: { identifier: email, password },
    })
    if (res.status !== 200 || !res.json?.token) {
      throw new Error(`loginUser failed (${res.status}): ${res.text.slice(0, 300)}`)
    }
    return { token: res.json.token, user: res.json.user }
  }

  async createProduct(overrides = {}) {
    const uid = this.#uid()
    const data = {
      name: `Test Product ${uid}`,
      basePrice: 100,
      currency: 'USD',
      status: 'published',
      ...overrides,
    }

    let productBody = { ...data }
    let res = await this.#request('/products', { method: 'POST', body: productBody })
    if (![200, 201].includes(res.status)) {
      // Multivendor mode can require tenant on product create.
      const tenantRequired =
        res.status === 400 &&
        (res.text.includes('"path":"tenant"') || res.text.toLowerCase().includes('tenant'))
      if (tenantRequired && !data.tenant) {
        const tenant = await this.createTenant()
        productBody = { ...productBody, tenant: tenant.id }
        res = await this.#request('/products', { method: 'POST', body: productBody })
      }
    }
    if (![200, 201].includes(res.status) && res.status === 400 && res.text.toLowerCase().includes('slug')) {
      const retryName = `Test Product ${this.#uid()}`
      const retryBody = {
        ...productBody,
        name: retryName,
        slug: retryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      }
      res = await this.#request('/products', { method: 'POST', body: retryBody })
    }
    if (![200, 201].includes(res.status)) {
      throw new Error(`createProduct failed (${res.status}): ${res.text.slice(0, 300)}`)
    }
    const doc = res.json?.doc || res.json
    this.#track('products', doc?.id)
    return doc
  }

  async createTenant(overrides = {}) {
    const uid = this.#uid()
    const data = {
      name: `Test Tenant ${uid}`,
      ...overrides,
    }
    const res = await this.#request('/tenants', { method: 'POST', body: data })
    if (![200, 201].includes(res.status)) {
      throw new Error(`createTenant failed (${res.status}): ${res.text.slice(0, 300)}`)
    }
    const doc = res.json?.doc || res.json
    this.#track('tenants', doc?.id)
    return doc
  }

  async createCategory(overrides = {}) {
    const uid = this.#uid()
    const data = {
      name: `Test Category ${uid}`,
      ...overrides,
    }

    const res = await this.#request('/categories', { method: 'POST', body: data })
    if (![200, 201].includes(res.status)) {
      throw new Error(`createCategory failed (${res.status}): ${res.text.slice(0, 300)}`)
    }
    const doc = res.json?.doc || res.json
    this.#track('categories', doc?.id)
    return doc
  }

  async createCart({ guestId, items }) {
    const headers = {}
    if (guestId) headers['X-Guest-Id'] = guestId

    const res = await this.#request('/carts', {
      method: 'POST',
      headers,
      body: { items },
    })
    if (![200, 201].includes(res.status)) {
      throw new Error(`createCart failed (${res.status}): ${res.text.slice(0, 300)}`)
    }
    const doc = res.json?.doc || res.json
    this.#track('carts', doc?.id)
    return doc
  }

  /**
   * Fetch verification codes for a given email (requires admin token).
   */
  async getVerificationCode({ email, type = 'email' }) {
    const res = await this.#request(
      `/verification-codes?limit=20&sort=-createdAt&where[type][equals]=${type}&where[identifier][equals]=${encodeURIComponent(email)}&where[used][equals]=false`
    )
    if (res.status !== 200 || !Array.isArray(res.json?.docs)) {
      throw new Error(`getVerificationCode failed (${res.status}): ${res.text.slice(0, 300)}`)
    }
    return res.json.docs[0] || null
  }

  /**
   * Generic entity creation for any collection.
   */
  async create(collection, data) {
    const res = await this.#request(`/${collection}`, { method: 'POST', body: data })
    if (![200, 201].includes(res.status)) {
      throw new Error(`create(${collection}) failed (${res.status}): ${res.text.slice(0, 300)}`)
    }
    const doc = res.json?.doc || res.json
    this.#track(collection, doc?.id)
    return doc
  }

  /**
   * Delete all tracked entities in reverse creation order.
   * Silently ignores 404s (already deleted / cascade).
   */
  async cleanup() {
    const items = [...this.#created].reverse()
    let errors = 0
    for (const { collection, id } of items) {
      try {
        // Tenant teardown can violate FK constraints via deep references
        // (products/order-items/sub-orders). Skip here; infra down -v resets DB
        // in automated runs.
        if (collection === 'tenants') {
          continue
        }

        const res = await this.#request(`/${collection}/${id}`, { method: 'DELETE' })
        if (res.status !== 200 && res.status !== 404) {
          if (this.#verbose) console.log(`  [DM] cleanup ${collection}/${id}: ${res.status}`)
          errors++
        }
      } catch {
        errors++
      }
    }
    this.#created = []
    if (this.#verbose) console.log(`  [DM] cleanup complete (${items.length} items, ${errors} errors)`)
  }
}
