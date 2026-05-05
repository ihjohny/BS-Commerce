/**
 * Custom login endpoint: accepts `identifier` (email or phone) + password.
 * Forwards to Payload's login with email or username based on format.
 * Decision #18: email OR phone login.
 */
import type { Endpoint } from 'payload'

import { LOOSE_EMAIL_FORMAT_RE } from '@/lib/validation/email-format'

export const authLoginEndpoint: Endpoint = {
  path: '/auth/login',
  method: 'post',
  handler: async (req) => {
    const data = (await (req as Request).json?.().catch(() => ({}))) || {}
    const { identifier, password } = data

    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return Response.json({ errors: [{ message: 'Identifier (email or phone) is required.' }] }, { status: 400 })
    }
    if (!password || typeof password !== 'string') {
      return Response.json({ errors: [{ message: 'Password is required.' }] }, { status: 400 })
    }

    const trimmed = identifier.trim().toLowerCase()
    const isEmail = LOOSE_EMAIL_FORMAT_RE.test(trimmed)

    const payload = req.payload
    const loginData = isEmail
      ? { email: trimmed, password }
      : { username: identifier.trim(), password }

    try {
      const result = await payload.login({
        collection: 'users',
        // loginWithUsername accepts email or username; Payload's generated types expect email
        data: loginData as any,
        req,
      })

      const requireVerified = process.env.AUTH_REQUIRE_VERIFIED_EMAIL_FOR_LOGIN === 'true'
      if (requireVerified) {
        const user = result?.user as { email?: string | null; emailVerified?: boolean } | undefined
        if (user?.email && user.emailVerified === false) {
          return Response.json(
            {
              errors: [
                {
                  message: 'Email address is not verified. Please verify your email before logging in.',
                },
              ],
            },
            { status: 403 }
          )
        }
      }

      const response = Response.json(result, { status: 200 })

      // payload.login() does not set cookies on custom endpoint responses.
      // Mirror Payload's built-in cookie: HttpOnly, SameSite=Lax, Path=/.
      if (result.token && result.exp) {
        const expires = new Date(result.exp * 1000).toUTCString()
        response.headers.append(
          'Set-Cookie',
          `payload-token=${result.token}; Expires=${expires}; Path=/; HttpOnly=true; SameSite=Lax`,
        )
      }

      return response
    } catch (err) {
      const status = (err as { status?: number })?.status ?? 401
      const message = err instanceof Error ? err.message : 'Authentication failed'
      return Response.json({ errors: [{ message }] }, { status })
    }
  },
}
