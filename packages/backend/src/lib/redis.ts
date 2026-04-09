/**
 * Redis client configuration for payloadcms-redis-plugin.
 * Redis is a required dependency used for:
 *   - Query caching with auto-invalidation (payloadcms-redis-plugin)
 *   - API rate limiting
 *   - Session storage (future)
 */
export const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
}

/**
 * Collections to cache in Redis.
 * These are the most frequently read, least frequently updated collections.
 */
export const cachedCollections = {
  categories: true,
  pages: true,
  media: true,
  // Keep products uncached for now: paginated reads are query-sensitive
  // and must always honor page/sort/filter params.
  products: false,
} as const
