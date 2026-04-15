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
/** Only list collections to cache; omit query-sensitive collections (e.g. products). */
export const cachedCollections = {
  categories: true,
  pages: true,
  media: true,
} as const
