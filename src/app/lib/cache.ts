import { Redis } from "ioredis";
import config from "../config";

/**
 * Cache façade over Redis with a graceful in-memory fallback.
 *
 * The API must stay functional when Redis is absent (local dev, free hosting)
 * — OTPs and rate-limited counters then live in this process only.
 */
class MemoryStore {
  private store = new Map<string, { value: string; expiresAt: number }>();

  get(key: string): string | null {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (hit.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return hit.value;
  }

  set(key: string, value: string, ttlSeconds: number) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  del(key: string) {
    this.store.delete(key);
  }

  incr(key: string): number {
    const current = Number(this.get(key) ?? 0) + 1;
    const ttl = this.store.get(key)?.expiresAt ?? Date.now() + 60_000;
    this.store.set(key, { value: String(current), expiresAt: ttl });
    return current;
  }
}

const memory = new MemoryStore();

let redis: Redis | null = null;
if (config.redis.url) {
  redis = new Redis(config.redis.url, { lazyConnect: true, maxRetriesPerRequest: 1 });
  redis.on("error", (error) => {
    console.warn("⚠️  Redis error — falling back to in-memory cache:", error.message);
  });
}

const withRedis = async <T>(action: (client: Redis) => Promise<T>, fallback: () => T): Promise<T> => {
  if (!redis) return fallback();
  try {
    if (redis.status === "wait" || redis.status === "end") await redis.connect();
    return await action(redis);
  } catch {
    return fallback();
  }
};

export const cache = {
  async get(key: string): Promise<string | null> {
    return withRedis((client) => client.get(key), () => memory.get(key));
  },
  async set(key: string, value: string, ttlSeconds = 300): Promise<void> {
    await withRedis<unknown>(
      (client) => client.set(key, value, "EX", ttlSeconds),
      () => memory.set(key, value, ttlSeconds),
    );
  },
  async del(key: string): Promise<void> {
    await withRedis<unknown>(
      (client) => client.del(key),
      () => memory.del(key),
    );
  },
  async remember<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const cached = await cache.get(key);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        /* fall through and reload */
      }
    }
    const fresh = await loader();
    await cache.set(key, JSON.stringify(fresh), ttlSeconds);
    return fresh;
  },
  async ping(): Promise<boolean> {
    return withRedis(
      async (client) => (await client.ping()) === "PONG",
      () => true,
    );
  },
};
