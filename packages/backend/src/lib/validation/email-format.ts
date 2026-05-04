/**
 * Lightweight email-shape check (guest checkout, auth login hints, verification UX).
 * Not RFC-complete; Payload/email adapters enforce policy where it matters.
 */
export const LOOSE_EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
