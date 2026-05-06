import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, '../../data/cache');

interface CacheEntry<T> {
  data: T;
  timestamp: number; // ms since epoch
  source: string;
}

/** In-memory cache with JSON file fallback and configurable TTL */
class CacheManager {
  private memoryCache = new Map<string, CacheEntry<unknown>>();
  private ttlMs: number;

  constructor(ttlMs?: number) {
    this.ttlMs = ttlMs ?? config.cacheTtlMs;
  }

  /**
   * Get data from cache. Returns { data, isFresh, timestamp, source } or null.
   * Checks memory first, then falls back to persisted JSON.
   */
  async get<T>(key: string): Promise<{
    data: T;
    isFresh: boolean;
    timestamp: number;
    source: string;
  } | null> {
    // 1. Check memory cache
    const memEntry = this.memoryCache.get(key) as CacheEntry<T> | undefined;
    if (memEntry) {
      const isFresh = Date.now() - memEntry.timestamp < this.ttlMs;
      return {
        data: memEntry.data,
        isFresh,
        timestamp: memEntry.timestamp,
        source: memEntry.source,
      };
    }

    // 2. Check persisted JSON fallback
    try {
      const filePath = this.getFilePath(key);
      const raw = await fs.readFile(filePath, 'utf-8');
      const entry = JSON.parse(raw) as CacheEntry<T>;
      // Populate memory cache from disk
      this.memoryCache.set(key, entry);
      const isFresh = Date.now() - entry.timestamp < this.ttlMs;
      return {
        data: entry.data,
        isFresh,
        timestamp: entry.timestamp,
        source: entry.source,
      };
    } catch {
      return null;
    }
  }

  /**
   * Store data in both memory cache and persisted JSON file.
   */
  async set<T>(key: string, data: T, source: string): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      source,
    };

    this.memoryCache.set(key, entry);

    // Persist to JSON file for restart recovery
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      const filePath = this.getFilePath(key);
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
    } catch {
      // Non-fatal: memory cache still works
    }
  }

  /** Invalidate a specific key from both memory and disk */
  async invalidate(key: string): Promise<void> {
    this.memoryCache.delete(key);
    try {
      await fs.unlink(this.getFilePath(key));
    } catch {
      // File may not exist
    }
  }

  /** Clear all cached data */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    try {
      const files = await fs.readdir(CACHE_DIR);
      await Promise.all(
        files.map((f) => fs.unlink(path.join(CACHE_DIR, f)).catch(() => {}))
      );
    } catch {
      // Directory may not exist
    }
  }

  /** Sanitize cache key into a safe filename */
  private getFilePath(key: string): string {
    const safeKey = key.replace(/[^a-z0-9_-]/gi, '_');
    return path.join(CACHE_DIR, `${safeKey}.json`);
  }
}

export const cacheManager = new CacheManager();
export default CacheManager;
