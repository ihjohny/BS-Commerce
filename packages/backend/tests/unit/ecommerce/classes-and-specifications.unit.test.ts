import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { parseSpecsFromSearchParams } from '../../../src/lib/specifications-query.ts'
// @ts-ignore
import { validateClassSpecifications } from '../../../src/plugins/ecommerce/collections/products.ts'
// @ts-ignore
import { storefrontFacetsEndpoint, productsFacetsEndpoint } from '../../../src/endpoints/storefront-facets.ts'

test('parseSpecsFromSearchParams parses single and multi-value specs', () => {
  const params1 = new URLSearchParams('specs[capacity]=20000mah&specs[battery_type]=lithium-ion')
  const result1 = parseSpecsFromSearchParams(params1)
  assert.deepEqual(result1.specs, {
    capacity: ['20000mah'],
    battery_type: ['lithium-ion'],
  })

  const params2 = new URLSearchParams('specs[capacity]=20000mah,30000mah')
  const result2 = parseSpecsFromSearchParams(params2)
  assert.deepEqual(result2.specs, {
    capacity: ['20000mah', '30000mah'],
  })

  const params3 = new URLSearchParams('specs[ram][]=8gb&specs[ram][]=16gb')
  const result3 = parseSpecsFromSearchParams(params3)
  assert.deepEqual(result3.specs, {
    ram: ['8gb', '16gb'],
  })

  const emptyParams = new URLSearchParams('category=electronics&sort=price_asc')
  const emptyResult = parseSpecsFromSearchParams(emptyParams)
  assert.deepEqual(emptyResult.specs, {})
})

test('validateClassSpecifications allows product without class', async () => {
  const data = {
    name: 'Unclassed Item',
    productClass: null,
    specifications: [],
  }
  const result = await validateClassSpecifications({
    data,
    req: { payload: {} as any },
  })
  assert.equal(result.name, 'Unclassed Item')
})

test('validateClassSpecifications passes when required specs are present and valid', async () => {
  const mockPayload = {
    findByID: async ({ collection, id }: any) => {
      if (collection === 'classes' && id === 'class-powerbank') {
        return {
          id: 'class-powerbank',
          name: 'Power Bank',
          slug: 'power-bank',
          parameters: [
            {
              key: 'capacity',
              label: 'Battery Capacity',
              type: 'select',
              isRequired: true,
              options: [
                { label: '10,000 mAh', value: '10000mah' },
                { label: '20,000 mAh', value: '20000mah' },
              ],
            },
            {
              key: 'total_output',
              label: 'Total Output',
              type: 'text',
              isRequired: true,
            },
          ],
        }
      }
      return null
    },
  }

  const data = {
    name: 'Anker PowerBank',
    status: 'published',
    productClass: 'class-powerbank',
    specifications: [
      { key: 'capacity', value: '20000mah' },
      { key: 'total_output', value: '65W' },
    ],
  }

  const result = await validateClassSpecifications({
    data,
    req: { payload: mockPayload as any },
  })
  assert.equal(result.name, 'Anker PowerBank')
  // Verify label and unit were auto-populated
  assert.equal(result.specifications[0].label, 'Battery Capacity')
  assert.equal(result.specifications[1].label, 'Total Output')
})

test('validateClassSpecifications purges old class parameters when class changes', async () => {
  const mockPayload = {
    findByID: async ({ collection, id }: any) => {
      if (collection === 'classes' && id === 'class-powerbank') {
        return {
          id: 'class-powerbank',
          name: 'Power Bank',
          slug: 'power-bank',
          parameters: [
            {
              key: 'capacity',
              label: 'Battery Capacity',
              type: 'select',
              isRequired: true,
              unit: 'mAh',
              options: [{ label: '20,000 mAh', value: '20000mah' }],
            },
          ],
        }
      }
      return null
    },
  }

  // Product previously had smartphone specs (screen_size, processor), now class is powerbank
  const data = {
    name: 'Converted Device',
    status: 'published',
    productClass: 'class-powerbank',
    specifications: [
      { key: 'screen_size', value: '6.8' },
      { key: 'processor', value: 'snapdragon' },
      { key: 'capacity', value: '20000mah' },
    ],
  }

  const result = await validateClassSpecifications({
    data,
    req: { payload: mockPayload as any },
  })

  // Should keep ONLY 'capacity' and purge 'screen_size' & 'processor'
  assert.equal(result.specifications.length, 1)
  assert.equal(result.specifications[0].key, 'capacity')
  assert.equal(result.specifications[0].value, '20000mah')
  assert.equal(result.specifications[0].label, 'Battery Capacity')
  assert.equal(result.specifications[0].unit, 'mAh')
})

test('validateClassSpecifications clears specifications when productClass is removed', async () => {
  const data = {
    name: 'Classless Device',
    status: 'draft',
    productClass: null,
    specifications: [
      { key: 'capacity', value: '20000mah' },
    ],
  }

  const result = await validateClassSpecifications({
    data,
    req: { payload: {} as any },
  })

  assert.deepEqual(result.specifications, [])
})

test('validateClassSpecifications rejects when required spec is missing on published product', async () => {
  const mockPayload = {
    findByID: async () => ({
      id: 'class-powerbank',
      name: 'Power Bank',
      slug: 'power-bank',
      parameters: [
        {
          key: 'capacity',
          label: 'Battery Capacity',
          type: 'select',
          isRequired: true,
          options: [{ label: '10,000 mAh', value: '10000mah' }],
        },
      ],
    }),
  }

  const data = {
    name: 'Anker PowerBank',
    status: 'published',
    productClass: 'class-powerbank',
    specifications: [],
  }

  await assert.rejects(
    () =>
      validateClassSpecifications({
        data,
        req: { payload: mockPayload as any },
      }),
    /required specification "Battery Capacity"/i,
  )
})

test('validateClassSpecifications rejects when select spec value is not in allowed options', async () => {
  const mockPayload = {
    findByID: async () => ({
      id: 'class-powerbank',
      name: 'Power Bank',
      slug: 'power-bank',
      parameters: [
        {
          key: 'capacity',
          label: 'Battery Capacity',
          type: 'select',
          isRequired: true,
          options: [
            { label: '10,000 mAh', value: '10000mah' },
            { label: '20,000 mAh', value: '20000mah' },
          ],
        },
      ],
    }),
  }

  const data = {
    name: 'Anker PowerBank',
    status: 'published',
    productClass: 'class-powerbank',
    specifications: [{ key: 'capacity', value: '99999mah' }],
  }

  await assert.rejects(
    () =>
      validateClassSpecifications({
        data,
        req: { payload: mockPayload as any },
      }),
    /invalid value "99999mah" for specification "Battery Capacity"/i,
  )
})

test('storefrontFacetsEndpoint returns aggregate facets with classes and specs', async () => {
  const mockPayload = {
    find: async ({ collection }: any) => {
      if (collection === 'categories') {
        return {
          docs: [
            { id: 'cat-phones', slug: 'phones', name: 'Phones' },
          ],
        }
      }
      if (collection === 'classes') {
        return {
          docs: [
            {
              id: 'class-phone',
              slug: 'smartphone',
              name: 'Smartphone',
              parameters: [
                {
                  key: 'processor',
                  label: 'Processor',
                  type: 'select',
                  isFilterable: true,
                  options: [
                    { label: 'A18 Pro', value: 'a18-pro' },
                    { label: 'Snapdragon 8 Gen 3', value: 'snapdragon' },
                  ],
                },
              ],
            },
          ],
        }
      }
      if (collection === 'products') {
        return {
          totalDocs: 2,
          docs: [
            {
              id: 'prod-1',
              basePrice: 120000,
              brand: 'brand-apple',
              categories: ['cat-phones'],
              productClass: 'class-phone',
              specifications: [{ key: 'processor', value: 'a18-pro' }],
            },
            {
              id: 'prod-2',
              basePrice: 140000,
              brand: 'brand-apple',
              categories: ['cat-phones'],
              productClass: 'class-phone',
              specifications: [{ key: 'processor', value: 'a18-pro' }],
            },
          ],
        }
      }
      return { docs: [], totalDocs: 0 }
    },
  }

  const req = {
    url: 'http://localhost/api/storefront/facets?category=phones',
    payload: mockPayload,
  } as any

  const res = await storefrontFacetsEndpoint.handler(req)
  assert.equal(res.status, 200)

  const data = await res.json()
  assert.ok(Array.isArray(data.classes))
  assert.equal(data.classes.length, 1)
  assert.equal(data.classes[0].slug, 'smartphone')

  // Verify facets
  assert.ok(Array.isArray(data.facets))
  assert.equal(data.facets.length, 1)
  assert.equal(data.facets[0].key, 'processor')
  assert.equal(data.facets[0].options[0].value, 'a18-pro')
  assert.equal(data.facets[0].options[0].count, 2)
})

test('productsFacetsEndpoint aliases storefrontFacetsEndpoint with 200 OK', async () => {
  const mockPayload = {
    find: async () => ({ docs: [], totalDocs: 0 }),
  }
  const req = {
    url: 'http://localhost/api/products/facets',
    payload: mockPayload,
  } as any

  const res = await productsFacetsEndpoint.handler(req)
  assert.equal(res.status, 200)
  const data = await res.json()
  assert.deepEqual(data.classes, [])
  assert.deepEqual(data.facets, [])
})
