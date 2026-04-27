import path from 'node:path'

/**
 * Directory for Payload `upload.staticDir` (product images, CMS uploads).
 *
 * Do **not** use a path inside `.next` or a folder that is replaced on every
 * `rsync` / new deploys that replace the app directory. On the VPS, set e.g.:
 *   PAYLOAD_MEDIA_DIR=/var/lib/bs-commerce/media
 * and `mkdir -p` with correct ownership for the app user.
 */
export function getMediaStaticDir(): string {
  const fromEnv = process.env.PAYLOAD_MEDIA_DIR?.trim()
  if (fromEnv) return path.resolve(fromEnv)
  return path.resolve(process.cwd(), 'media')
}
