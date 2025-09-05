export interface CacheEntry<T> {
  value: T;
  expiry: number;
  size: number;
}

export interface CacheOptions {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache size in bytes
  maxEntries: number; // Maximum number of entries
}

export class SimpleCache<T> {
  private readonly cache = new Map<string, CacheEntry<T>>();
  private readonly options: Required<CacheOptions>;
  private currentSize = 0;

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = {
      ttl: options.ttl ?? 5 * 60 * 1000, // 5 minutes default
      maxSize: options.maxSize ?? 10 * 1024 * 1024, // 10MB default
      maxEntries: options.maxEntries ?? 1000,
    };
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttl?: number): boolean {
    const effectiveTtl = ttl ?? this.options.ttl;
    const expiry = Date.now() + effectiveTtl;
    
    // Estimate size (rough approximation)
    const size = this.estimateSize(value);
    
    // Check if adding this entry would exceed limits
    if (size > this.options.maxSize) {
      return false; // Value too large to cache
    }

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Clean up expired entries and enforce size limits
    this.cleanup();

    // Check if we need to make room
    while (
      (this.cache.size >= this.options.maxEntries ||
       this.currentSize + size > this.options.maxSize) &&
      this.cache.size > 0
    ) {
      this.evictOldest();
    }

    // Add the new entry
    const entry: CacheEntry<T> = {
      value,
      expiry,
      size,
    };

    this.cache.set(key, entry);
    this.currentSize += size;

    return true;
  }

  /**
   * Delete a specific key from the cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    this.cache.delete(key);
    this.currentSize -= entry.size;
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: number;
    memoryUsage: number;
    hitRate?: number;
  } {
    return {
      size: this.cache.size,
      entries: this.cache.size,
      memoryUsage: this.currentSize,
    };
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiry) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get all cache keys (excluding expired ones)
   */
  keys(): string[] {
    this.cleanup();
    return Array.from(this.cache.keys());
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.delete(key);
    }
  }

  /**
   * Evict the oldest entry (LRU approximation)
   */
  private evictOldest(): void {
    // Simple FIFO eviction (not true LRU, but simpler)
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.delete(firstKey);
    }
  }

  /**
   * Estimate the size of a value in bytes (rough approximation)
   */
  private estimateSize(value: T): number {
    try {
      // Very rough size estimation
      const serialized = JSON.stringify(value);
      return serialized.length * 2; // Rough estimate for UTF-16
    } catch {
      // If JSON.stringify fails, assume a reasonable default
      return 1024; // 1KB default
    }
  }
}

/**
 * HTTP response cache specifically designed for API responses
 */
export class HttpResponseCache {
  private readonly cache: SimpleCache<any>;

  constructor(options: Partial<CacheOptions> = {}) {
    this.cache = new SimpleCache({
      ttl: 2 * 60 * 1000, // 2 minutes for HTTP responses
      maxSize: 5 * 1024 * 1024, // 5MB for responses
      maxEntries: 500,
      ...options,
    });
  }

  /**
   * Generate a cache key for HTTP requests
   */
  private generateKey(method: string, url: string, body?: any): string {
    const bodyStr = body ? JSON.stringify(body) : '';
    return `${method}:${url}:${bodyStr}`;
  }

  /**
   * Get cached response
   */
  get(method: string, url: string, body?: any): any | undefined {
    // Only cache GET requests
    if (method !== 'GET') {
      return undefined;
    }

    const key = this.generateKey(method, url, body);
    return this.cache.get(key);
  }

  /**
   * Cache a response
   */
  set(method: string, url: string, response: any, body?: any, ttl?: number): boolean {
    // Only cache GET requests
    if (method !== 'GET') {
      return false;
    }

    // Don't cache error responses
    if (response.status && response.status >= 400) {
      return false;
    }

    const key = this.generateKey(method, url, body);
    return this.cache.set(key, response, ttl);
  }

  /**
   * Invalidate cache entries for mutations
   */
  invalidate(url: string): void {
    const keys = this.cache.keys();
    const baseUrl = url.split('?')[0] || url; // Remove query parameters
    
    for (const key of keys) {
      if (key.includes(baseUrl)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached responses
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): ReturnType<SimpleCache<any>['getStats']> {
    return this.cache.getStats();
  }
}

// Export a default instance
export const defaultHttpCache = new HttpResponseCache();