import { describe, it, expect } from 'vitest';
import { createSystemClock, createFixedClock } from 'app/lib/clock.js';

describe('systemClock', () => {
  it('now() returns current timestamp (ms)', () => {
    const c = createSystemClock();
    const before = Date.now();
    const n = c.now();
    const after = Date.now();
    expect(n).toBeGreaterThanOrEqual(before);
    expect(n).toBeLessThanOrEqual(after);
  });

  it('nowIso() returns valid ISO 8601', () => {
    const c = createSystemClock();
    const iso = c.nowIso();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\..*Z$/);
    // Parseable round-trip
    expect(new Date(iso).toISOString()).toBe(iso);
  });
});

describe('fixedClock', () => {
  it('now() returns fixed ms', () => {
    const c = createFixedClock(1_700_000_000_000);
    expect(c.now()).toBe(1_700_000_000_000);
  });

  it('now() returns same value on repeated calls', () => {
    const c = createFixedClock(42);
    expect(c.now()).toBe(42);
    expect(c.now()).toBe(42);
    expect(c.now()).toBe(42);
  });

  it('nowIso() derives from fixed ms', () => {
    const c = createFixedClock(1_700_000_000_000);
    expect(c.nowIso()).toBe('2023-11-14T22:13:20.000Z');
  });

  it('nowIso() for 0 returns epoch', () => {
    const c = createFixedClock(0);
    expect(c.nowIso()).toBe('1970-01-01T00:00:00.000Z');
  });
});
