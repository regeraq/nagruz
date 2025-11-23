/**
 * Simple in-memory cache implementation
 * 
 * NOTE: For production, use Redis:
 * import Redis from 'ioredis';
 * const redis = new Redis(process.env.REDIS_URL);
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleCache {
  private store: Map<string, CacheEntry<any>> = new Map();

  /**
   * Sets a value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlMs - Time to live in milliseconds
   */
  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      data: value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Gets a value from cache
   * @param key - Cache key
   * @returns Cached value or undefined
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  /**
   * Deletes a value from cache
   * @param key - Cache key
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clears all expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clears all entries
   */
  clear(): void {
    this.store.clear();
  }
}

// Global cache instance
export const cache = new SimpleCache();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  cache.cleanup();
}, 5 * 60 * 1000);

// Cache TTL constants
export const CACHE_TTL = {
  CRYPTO_RATES: 30 * 1000, // 30 seconds
  PRODUCTS: 5 * 60 * 1000, // 5 minutes
  PROMO_CODES: 60 * 1000, // 1 minute
} as const;


