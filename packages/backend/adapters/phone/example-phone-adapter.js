/**
 * Custom phone verification adapter — edit this file to use your SMS gateway.
 *
 * Contract: export an object with sendOTP(phone, code, expirySeconds) => Promise<boolean>.
 * Config: PHONE_VERIFICATION_PROVIDER=custom and
 * VERIFICATION_PHONE_ADAPTER_PATH=./adapters/phone/example-phone-adapter.js
 *
 * For complex logic or custom npm dependencies, see adapters/phone/README.md.
 */

/**
 * Sends an OTP to the given phone number.
 *
 * @param {string} phone - Phone number (E.164 recommended, e.g. +8801712345678).
 * @param {string} code - One-time code (e.g. 6 digits).
 * @param {number} expirySeconds - Code validity in seconds (for optional message text).
 * @returns {Promise<boolean>} - true if send succeeded, false on failure.
 */
async function sendOTP(phone, code, expirySeconds) {
  // -------------------------------------------------------------------------
  // TODO: Replace with your SMS gateway (Twilio, Vonage, AWS SNS, local BD
  //       gateways like SSL Wireless, muthofun, or your provider's HTTP API).
  // -------------------------------------------------------------------------

  // Example: log only (for local testing without a real gateway).
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Custom phone adapter] sendOTP:', { phone, code, expirySeconds })
  }

  // Example: call an HTTP API (uncomment and adjust for your provider).
  // const res = await fetch('https://your-sms-gateway.com/send', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.MY_SMS_API_KEY}` },
  //   body: JSON.stringify({ to: phone, message: `Your code is ${code}. Valid for ${Math.ceil(expirySeconds / 60)} min.` }),
  // })
  // if (!res.ok) {
  //   console.error('[Custom phone adapter] Gateway error:', await res.text())
  //   return false
  // }
  // return true

  return true
}

module.exports = { sendOTP }
module.exports.default = { sendOTP }
