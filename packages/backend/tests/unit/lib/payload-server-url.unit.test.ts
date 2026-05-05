import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import {
  getPayloadServerUrl,
  getSslCommerzIpnPublicBaseUrl,
} from '../../../src/lib/payload-server-url.ts'

const keys = [
  'SERVER_PUBLIC_URL',
  'PAYLOAD_PUBLIC_URL',
  'NEXT_PUBLIC_APP_URL',
  'SSLCOMMERZ_IPN_PUBLIC_URL',
] as const

const snapshot: Partial<Record<(typeof keys)[number], string | undefined>> = {}

beforeEach(() => {
  for (const k of keys) snapshot[k] = process.env[k]
  for (const k of keys) delete process.env[k]
})

afterEach(() => {
  for (const k of keys) {
    if (snapshot[k] === undefined) delete process.env[k]
    else process.env[k] = snapshot[k]
  }
})

test('should resolve getPayloadServerUrl with SERVER_PUBLIC_URL precedence', () => {
  process.env.SERVER_PUBLIC_URL = 'https://api.example.net/'
  process.env.PAYLOAD_PUBLIC_URL = 'https://wrong.example/'
  process.env.NEXT_PUBLIC_APP_URL = 'https://wrong2.example/'
  assert.equal(getPayloadServerUrl(), 'https://api.example.net')
})

test('should resolve getSslCommerzIpnPublicBaseUrl from SSLCOMMERZ_IPN_PUBLIC_URL when set', () => {
  process.env.SERVER_PUBLIC_URL = 'https://api.example.net'
  process.env.SSLCOMMERZ_IPN_PUBLIC_URL = 'https://ipn-only.example/'
  assert.equal(getSslCommerzIpnPublicBaseUrl(), 'https://ipn-only.example')
})

test('should fall back getSslCommerzIpnPublicBaseUrl to getPayloadServerUrl without override', () => {
  process.env.SERVER_PUBLIC_URL = 'https://api.example.net/'
  assert.equal(getSslCommerzIpnPublicBaseUrl(), 'https://api.example.net')
})
