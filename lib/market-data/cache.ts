/**
 * Simple in-memory TTL cache for market data.
 *
 * Used to avoid refetching the same data multiple times within a short window,
 * especially important when:
 *   - Rate limits apply (e.g. Yahoo Finance informal limits)
 *   - Multiple enrichments run in quick succession
 *   - User clicks "Refresh" repeatedly
 *
 * NOTE: This is a per-process cache. In serverless environments (Vercel),
 * each function instance has its own cache. For production at scale,
 * consider Redis or a shared cache layer.
 */

export type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class TTLCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly defaultTTLMs: number;

  constructor(defaultTTLMs: number = 5 * 60 * 1000) {
    this.defaultTTLMs = defaultTTLMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTLMs),
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  /**
   * Get an item from cache, or compute and cache it if missing.
   */
  async getOrSet(
    key: string,
    compute: () => Promise<T>,
    ttlMs?: number,
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await compute();
    this.set(key, value, ttlMs);
    return value;
  }
}

// ---------------------------------------------------------------------------
// Shared cache instances for market data
// ---------------------------------------------------------------------------

import type { AssetProfile, LatestQuote, HistoricalPricePoint } from "./types";

/** Profile cache — 1 hour TTL (company info changes rarely) */
export const profileCache = new TTLCache<AssetProfile>(60 * 60 * 1000);

/** Quote cache — short TTL so the live pull is not stuck on a stale print */
export const quoteCache = new TTLCache<LatestQuote>(45 * 1000);

/** Historical cache — 1 hour TTL (daily candles only change once per day) */
export const historyCache = new TTLCache<HistoricalPricePoint[]>(60 * 60 * 1000);
