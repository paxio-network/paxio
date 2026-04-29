'use strict';

/**
 * In-memory cache stub — W-1.4.
 *
 * TODO M-L1-impl: replace with Redis-backed implementation once
 * FA-01 (M-L1-impl) lands Redis integration.
 *
 * In production: use a shared Redis client with prefix-scoped keys
 * (e.g. `paxio:cache:{key}`) and proper expiry. This stub is for
 * cold-registry / zero-fill scenarios only.
 */

class MemoryCache {
  constructor() {
    // Map<key, { value, expiresAt }>
    this._store = new Map();
  }

  /**
   * @param {string} key
   * @returns {Promise<T | null>}
   */
  async get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * @param {string} key
   * @param {number} ttlSec - TTL in seconds
   * @param {T} value
   * @returns {Promise<void>}
   */
  async setex(key, ttlSec, value) {
    this._store.set(key, {
      value,
      expiresAt: Date.now() + ttlSec * 1000,
    });
  }
}

module.exports = { MemoryCache };