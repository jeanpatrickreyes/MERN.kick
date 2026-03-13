import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL && REDIS_URL === "redis://localhost:6379") {
    try {
      if (!client) {
        client = new Redis(REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: true });
        client.on("error", (err) => console.warn("[Redis] Error:", err.message));
      }
      return client;
    } catch {
      return null;
    }
  }
  if (!client && process.env.REDIS_URL) {
    client = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: true });
    client.on("error", (err) => console.warn("[Redis] Error:", err.message));
  }
  return client;
}

export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = 300
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await redis.setex(key, ttlSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }
  } catch (e) {
    console.warn("[Redis] cacheSet error:", e);
  }
}

export async function cacheDel(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {}
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch {}
}

export const CacheKeys = {
  matchesList: (refresh?: boolean) => `matches:list:${refresh ? "refresh" : "default"}`,
  matchDetail: (id: string) => `match:${id}`,
  /** Lock key for batch analysis – only one Gemini batch runs at a time */
  analysisBatchLock: () => "analysis:batch:lock",
  /** All-match analysis response cache (optional) */
  analysisAll: () => "analysis:all",
};

const LOCK_TTL_SECONDS = 60;

/**
 * Acquire a Redis lock (NX + EX). Prevents duplicate Gemini batch calls.
 * @returns true if lock acquired, false if already held
 */
export async function acquireLock(key: string, ttlSeconds: number = LOCK_TTL_SECONDS): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    const result = await redis.set(key, "1", "EX", ttlSeconds, "NX");
    return result === "OK";
  } catch {
    return false;
  }
}

/**
 * Release the lock (delete key). Call after batch analysis completes.
 */
export async function releaseLock(key: string): Promise<void> {
  await cacheDel(key);
}

/** Ping Redis to verify connection. Returns true if connected. */
export async function checkRedisConnection(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

/** Whether Redis is explicitly configured via REDIS_URL. */
export function isRedisConfigured(): boolean {
  return !!process.env.REDIS_URL;
}
