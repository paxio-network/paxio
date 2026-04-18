import { describe, it, expect } from 'vitest';
import {
  ok,
  err,
  isOk,
  isErr,
  map,
  chain,
  mapErr,
  unwrap,
  unwrapOr,
} from 'app/types/result.js';

describe('Result.ok', () => {
  it('creates Ok variant with value', () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    expect(isOk(r)).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });
});

describe('Result.err', () => {
  it('creates Err variant with error', () => {
    const r = err('bad');
    expect(r.ok).toBe(false);
    expect(isErr(r)).toBe(true);
    if (!r.ok) expect(r.error).toBe('bad');
  });
});

describe('Result.map', () => {
  it('transforms Ok value', () => {
    const r = map(ok(2), (n) => n * 3);
    expect(unwrap(r)).toBe(6);
  });

  it('leaves Err unchanged', () => {
    const r = map<number, number, string>(err('bad'), (n) => n * 3);
    expect(isErr(r)).toBe(true);
    if (!r.ok) expect(r.error).toBe('bad');
  });
});

describe('Result.chain', () => {
  it('flatMaps over Ok', () => {
    const r = chain(ok(2), (n) => (n > 0 ? ok(n * 10) : err('neg')));
    expect(unwrap(r)).toBe(20);
  });

  it('short-circuits on Err', () => {
    const r = chain(err<string>('prev'), (n: number) => ok(n * 10));
    expect(isErr(r)).toBe(true);
  });

  it('propagates inner Err', () => {
    const r = chain(ok(-1), (n) => (n > 0 ? ok(n) : err('negative')));
    expect(isErr(r) && r.error).toBe('negative');
  });
});

describe('Result.mapErr', () => {
  it('transforms Err value', () => {
    const r = mapErr(err('low'), (e) => e.toUpperCase());
    expect(isErr(r) && r.error).toBe('LOW');
  });

  it('leaves Ok unchanged', () => {
    const r = mapErr(ok(5), (e: string) => e.toUpperCase());
    expect(unwrap(r)).toBe(5);
  });
});

describe('Result.unwrap', () => {
  it('returns value for Ok', () => {
    expect(unwrap(ok('hello'))).toBe('hello');
  });

  it('throws on Err', () => {
    expect(() => unwrap(err('bad'))).toThrow(/unwrap on Err/);
  });
});

describe('Result.unwrapOr', () => {
  it('returns value for Ok', () => {
    expect(unwrapOr(ok(5), 0)).toBe(5);
  });

  it('returns fallback for Err', () => {
    expect(unwrapOr(err<string>('bad'), 99)).toBe(99);
  });
});
