import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

// user+orgs resolution runs on EVERY authenticated request (two joined
// queries); auth.middleware caches it per user for a short window. The key +
// busters live here (not in the backend middleware) so the library services
// that mutate permissions — subscription downgrade/cancel, member disable —
// can invalidate stale entries too, instead of a removed/downgraded user
// keeping access for up to the TTL.
export const AUTH_CACHE_TTL_SECONDS = 30;

export const authContextCacheKey = (userId: string) => `authctx:${userId}`;

export const bustAuthContextCache = (userId: string) =>
  ioRedis.del(authContextCacheKey(userId)).catch(() => {});

export const bustAuthContextCacheForUsers = (userIds: string[]) =>
  userIds.length
    ? ioRedis.del(...userIds.map(authContextCacheKey)).catch(() => {})
    : Promise.resolve(0);
