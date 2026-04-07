/**
 * In-memory TTL cache + in-flight deduplication for MLB API reads.
 * Failed requests are not cached; callers can retry immediately.
 */

const pending = new Map<string, Promise<unknown>>();
const cache = new Map<string, { expires: number; value: unknown }>();

export async function withCacheAndDedupe<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  shouldCache?: (result: T) => boolean
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) {
    return hit.value as T;
  }

  const existing = pending.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const store = shouldCache ?? (() => true);

  const p = fetcher()
    .then((value) => {
      pending.delete(key);
      if (store(value)) {
        cache.set(key, { expires: Date.now() + ttlMs, value });
      }
      return value;
    })
    .catch((err) => {
      pending.delete(key);
      throw err;
    });

  pending.set(key, p);
  return p;
}

/** Clears cache (useful in tests to avoid cross-test leakage). */
export function __clearApiCacheForTests(): void {
  cache.clear();
  pending.clear();
}

/** Drop a cached entry so the next read refetches (e.g. pull-to-refresh). */
export function invalidateCacheKey(key: string): void {
  cache.delete(key);
}
