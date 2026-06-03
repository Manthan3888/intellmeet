import { Redis } from 'ioredis';
import { config } from '../config/index.js';

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;
  try {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    redis.on('error', () => {
      // Redis optional in dev
    });
    redis.connect().catch(() => {
      redis = null;
    });
    return redis;
  } catch {
    return null;
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    return await client.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds = 300): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.setex(key, ttlSeconds, value);
  } catch {
    // ignore
  }
}

export async function cacheDel(key: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.del(key);
  } catch {
    // ignore
  }
}
