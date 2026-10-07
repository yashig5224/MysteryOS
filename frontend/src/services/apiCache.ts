/**
 * apiCache.ts
 * Lightweight in-memory cache for API GET responses.
 *
 * Key format: "<datasetId>:<endpoint>"
 * Cache is module-level (singleton for the browser session).
 *
 * Rules:
 * - Only GET/read results are cached.
 * - POST / mutation results bypass the cache.
 * - Call `apiCache.invalidate(datasetId)` to drop all entries for a dataset
 *   (e.g. after running a new analysis or re-synthesising evidence).
 */

interface CacheEntry<T> {
  value: T;
  /** Unix ms timestamp when the entry was stored */
  storedAt: number;
}

/** Default TTL: 5 minutes (ms). Tab switching within this window is free. */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

class ApiCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private inFlight = new Map<string, Promise<any>>();

  private key(datasetId: string, endpoint: string): string {
    return `${datasetId}:${endpoint}`;
  }

  get<T>(datasetId: string, endpoint: string, ttlMs = DEFAULT_TTL_MS): T | null {
    const k = this.key(datasetId, endpoint);
    const entry = this.store.get(k) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.storedAt > ttlMs) {
      this.store.delete(k);
      return null;
    }
    return entry.value;
  }

  set<T>(datasetId: string, endpoint: string, value: T): void {
    this.store.set(this.key(datasetId, endpoint), {
      value,
      storedAt: Date.now(),
    });
  }

  has(datasetId: string, endpoint: string, ttlMs = DEFAULT_TTL_MS): boolean {
    return this.get(datasetId, endpoint, ttlMs) !== null;
  }

  /**
   * Deduplicate concurrent in-flight requests for the exact same key.
   */
  async dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key) as Promise<T>;
    }
    const promise = fetcher().finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, promise);
    return promise;
  }

  /** Remove every cached entry for a specific dataset (e.g. after re-analysis). */
  invalidate(datasetId: string): void {
    const prefix = `${datasetId}:`;
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) this.store.delete(k);
    }
    for (const k of this.inFlight.keys()) {
      if (k.startsWith(prefix)) this.inFlight.delete(k);
    }
  }

  /** Remove a single cached entry. */
  invalidateOne(datasetId: string, endpoint: string): void {
    this.store.delete(this.key(datasetId, endpoint));
  }

  /** Wipe the entire cache (used in tests or hard resets). */
  clear(): void {
    this.store.clear();
  }
}

export const apiCache = new ApiCache();
