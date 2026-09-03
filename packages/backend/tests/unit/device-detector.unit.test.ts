import test from 'node:test'
import assert from 'node:assert/strict'
import { detectDeviceFromUserAgent } from '../../src/lib/device-detector.ts'

test('detectDeviceFromUserAgent should handle null, undefined, and empty strings gracefully', () => {
  assert.deepEqual(detectDeviceFromUserAgent(null), {
    deviceType: 'unknown',
    browser: 'Unknown',
    os: 'Unknown',
  })
  assert.deepEqual(detectDeviceFromUserAgent(undefined), {
    deviceType: 'unknown',
    browser: 'Unknown',
    os: 'Unknown',
  })
  assert.deepEqual(detectDeviceFromUserAgent(''), {
    deviceType: 'unknown',
    browser: 'Unknown',
    os: 'Unknown',
  })
})

test('detectDeviceFromUserAgent should detect desktop macOS Safari', () => {
  const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
  const result = detectDeviceFromUserAgent(ua)
  assert.equal(result.deviceType, 'desktop')
  assert.equal(result.os, 'macOS')
  assert.equal(result.browser, 'Safari 18')
})

test('detectDeviceFromUserAgent should detect desktop Windows Chrome', () => {
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  const result = detectDeviceFromUserAgent(ua)
  assert.equal(result.deviceType, 'desktop')
  assert.equal(result.os, 'Windows 10/11')
  assert.equal(result.browser, 'Chrome 128')
})

test('detectDeviceFromUserAgent should detect mobile iPhone Safari', () => {
  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
  const result = detectDeviceFromUserAgent(ua)
  assert.equal(result.deviceType, 'mobile')
  assert.equal(result.os, 'iOS (iPhone)')
  assert.equal(result.browser, 'Safari 17')
})

test('detectDeviceFromUserAgent should detect mobile Android Chrome', () => {
  const ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36'
  const result = detectDeviceFromUserAgent(ua)
  assert.equal(result.deviceType, 'mobile')
  assert.equal(result.os, 'Android')
  assert.equal(result.browser, 'Chrome 128')
})

test('detectDeviceFromUserAgent should detect tablet iPad', () => {
  const ua = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
  const result = detectDeviceFromUserAgent(ua)
  assert.equal(result.deviceType, 'tablet')
  assert.equal(result.os, 'iPadOS')
})

test('detectDeviceFromUserAgent should detect automated bots and crawlers', () => {
  const botUa = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
  const result = detectDeviceFromUserAgent(botUa)
  assert.equal(result.deviceType, 'bot')
  assert.equal(result.browser, 'Bot/Crawler')
})
