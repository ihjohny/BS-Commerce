export interface DeviceInfo {
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown'
  browser: string
  os: string
}

/**
 * Lightweight, zero-dependency User-Agent analyzer for audit, fraud prevention,
 * and customer session insights.
 */
export function detectDeviceFromUserAgent(ua: string | null | undefined): DeviceInfo {
  if (!ua || typeof ua !== 'string') {
    return {
      deviceType: 'unknown',
      browser: 'Unknown',
      os: 'Unknown',
    }
  }

  const uaLower = ua.toLowerCase()

  // 1. Bot detection
  if (
    uaLower.includes('bot') ||
    uaLower.includes('crawler') ||
    uaLower.includes('spider') ||
    uaLower.includes('curl') ||
    uaLower.includes('wget') ||
    uaLower.includes('python-requests')
  ) {
    return {
      deviceType: 'bot',
      browser: 'Bot/Crawler',
      os: 'Automated',
    }
  }

  // 2. OS detection
  let os = 'Unknown OS'
  if (ua.includes('iPhone')) {
    os = 'iOS (iPhone)'
  } else if (ua.includes('iPad')) {
    os = 'iPadOS'
  } else if (ua.includes('Android')) {
    os = 'Android'
  } else if (ua.includes('Macintosh') || ua.includes('Mac OS X')) {
    os = 'macOS'
  } else if (ua.includes('Windows NT 10.0')) {
    os = 'Windows 10/11'
  } else if (ua.includes('Windows NT 6.3')) {
    os = 'Windows 8.1'
  } else if (ua.includes('Windows NT 6.1')) {
    os = 'Windows 7'
  } else if (ua.includes('Windows NT')) {
    os = 'Windows'
  } else if (ua.includes('CrOS')) {
    os = 'ChromeOS'
  } else if (ua.includes('Linux')) {
    os = 'Linux'
  }

  // 3. Device type detection
  let deviceType: DeviceInfo['deviceType'] = 'desktop'
  if (
    ua.includes('iPad') ||
    (ua.includes('Android') && !uaLower.includes('mobile')) ||
    uaLower.includes('tablet')
  ) {
    deviceType = 'tablet'
  } else if (
    uaLower.includes('mobile') ||
    ua.includes('iPhone') ||
    ua.includes('iPod') ||
    (ua.includes('Android') && uaLower.includes('mobile'))
  ) {
    deviceType = 'mobile'
  }

  // 4. Browser detection
  let browser = 'Unknown Browser'
  if (ua.includes('Edg/')) {
    const match = ua.match(/Edg\/([\d.]+)/)
    browser = `Edge ${match ? match[1].split('.')[0] : ''}`.trim()
  } else if (ua.includes('OPR/') || ua.includes('Opera/')) {
    const match = ua.match(/(?:OPR|Opera)\/([\d.]+)/)
    browser = `Opera ${match ? match[1].split('.')[0] : ''}`.trim()
  } else if (ua.includes('Chrome/') && !ua.includes('Chromium/')) {
    const match = ua.match(/Chrome\/([\d.]+)/)
    browser = `Chrome ${match ? match[1].split('.')[0] : ''}`.trim()
  } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    const match = ua.match(/Version\/([\d.]+)/)
    browser = `Safari ${match ? match[1].split('.')[0] : ''}`.trim()
  } else if (ua.includes('Firefox/')) {
    const match = ua.match(/Firefox\/([\d.]+)/)
    browser = `Firefox ${match ? match[1].split('.')[0] : ''}`.trim()
  } else if (ua.includes('SamsungBrowser/')) {
    const match = ua.match(/SamsungBrowser\/([\d.]+)/)
    browser = `Samsung Internet ${match ? match[1].split('.')[0] : ''}`.trim()
  }

  return {
    deviceType,
    browser,
    os,
  }
}
