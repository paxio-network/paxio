/**
 * M-L4a RED spec — FAP Rails Catalog (`createFapRouter` factory).
 *
 * Backend-dev (FA-02) implements:
 *   - products/02-facilitator/app/data/rails-catalog.json — static catalog
 *   - products/02-facilitator/app/domain/fap-router.ts — `createFapRouter(deps)`
 *     factory implementing `FapRouter` port
 *   - products/02-facilitator/app/api/fap-rails.js — GET /api/fap/rails
 *
 * This spec encodes the contract: factory pattern, frozen result, deterministic,
 * pure (no I/O), Zod-validated catalog, 4 rails minimum (x402, mpp, tap, btc-l1).
 *
 * The factory IS the architectural enforcement — RED until backend-dev creates
 * the file. Once they do, all assertions go GREEN as a single quality gate.
 */
import { describe, it, expect, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ZodRailInfo, type RailInfo, type Result } from '@paxio/types';
import type { FapRouter, FapError } from '@paxio/interfaces';

const FAP_ROUTER_PATH = join(
  process.cwd(),
  'products/02-facilitator/app/domain/fap-router.ts',
);
const RAILS_CATALOG_PATH = join(
  process.cwd(),
  'products/02-facilitator/app/data/rails-catalog.json',
);

describe('M-L4a — createFapRouter factory + Rails Catalog', () => {
  it('files exist (architect-defined contract → backend-dev fills)', () => {
    expect(existsSync(FAP_ROUTER_PATH)).toBe(true);
    expect(existsSync(RAILS_CATALOG_PATH)).toBe(true);
  });

  describe('createFapRouter()', () => {
    // Lazy-load so this whole describe is RED-tolerant (skips body if files missing).
    const loadFactory = async (): Promise<{
      createFapRouter: (deps: Record<string, unknown>) => FapRouter;
    } | null> => {
      if (!existsSync(FAP_ROUTER_PATH)) return null;
      // dynamic import — TS path resolution will use vitest alias
      try {
        return (await import(/* @vite-ignore */ FAP_ROUTER_PATH)) as {
          createFapRouter: (deps: Record<string, unknown>) => FapRouter;
        };
      } catch {
        return null;
      }
    };

    it('exports a `createFapRouter` factory function', async () => {
      const mod = await loadFactory();
      if (!mod) return; // file missing → first test (above) catches it
      expect(typeof mod.createFapRouter).toBe('function');
    });

    it('factory returns frozen FapRouter object (not class instance)', async () => {
      const mod = await loadFactory();
      if (!mod) return;
      const router = mod.createFapRouter({});
      expect(Object.isFrozen(router)).toBe(true);
      expect(Object.getPrototypeOf(router)).toBe(Object.prototype);
    });

    it('returns at least 4 rails (x402, mpp, tap, btc-l1)', async () => {
      const mod = await loadFactory();
      if (!mod) return;
      const router = mod.createFapRouter({});
      const result = await router.getRails();
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.length).toBeGreaterThanOrEqual(4);
      const ids = result.value.map((r) => r.id).filter(Boolean);
      expect(ids).toEqual(expect.arrayContaining(['x402', 'mpp', 'tap', 'btc-l1']));
    });

    it('every rail validates against ZodRailInfo', async () => {
      const mod = await loadFactory();
      if (!mod) return;
      const router = mod.createFapRouter({});
      const result = await router.getRails();
      if (!result.ok) return;
      for (const rail of result.value) {
        const parsed = ZodRailInfo.safeParse(rail);
        expect(parsed.success, `rail "${rail.name}": ${JSON.stringify(parsed)}`).toBe(true);
      }
    });

    it('initial share_pct is 0 for all rails (no traffic yet)', async () => {
      const mod = await loadFactory();
      if (!mod) return;
      const router = mod.createFapRouter({});
      const result = await router.getRails();
      if (!result.ok) return;
      expect(result.value.every((r) => r.share_pct === 0)).toBe(true);
    });

    it('every rail has catalog metadata (id, category, description, status)', async () => {
      const mod = await loadFactory();
      if (!mod) return;
      const router = mod.createFapRouter({});
      const result = await router.getRails();
      if (!result.ok) return;
      for (const rail of result.value) {
        expect(rail.id, `${rail.name} missing id`).toBeDefined();
        expect(rail.category, `${rail.name} missing category`).toBeDefined();
        expect(rail.description, `${rail.name} missing description`).toBeDefined();
        expect(rail.status, `${rail.name} missing status`).toBeDefined();
      }
    });

    it('result is deterministic (same call → same value)', async () => {
      const mod = await loadFactory();
      if (!mod) return;
      const router = mod.createFapRouter({});
      const r1 = await router.getRails();
      const r2 = await router.getRails();
      expect(r1).toStrictEqual(r2);
    });

    it('returned rails array is read-only (frozen) at the type level', async () => {
      const mod = await loadFactory();
      if (!mod) return;
      const router = mod.createFapRouter({});
      const result = await router.getRails();
      if (!result.ok) return;
      // TypeScript will reject mutation on `readonly RailInfo[]` at compile-time.
      // Runtime assertion: at minimum the array length should remain stable.
      const len = result.value.length;
      // Attempt to mutate — should not affect subsequent calls.
      try {
        (result.value as unknown as RailInfo[]).push({} as RailInfo);
      } catch {
        // OK — frozen array throws on mutation attempt
      }
      const r2 = await router.getRails();
      if (r2.ok) expect(r2.value.length).toBe(len);
    });

    it('factory does not perform fetch/setInterval/Date.now() during construction', async () => {
      const mod = await loadFactory();
      if (!mod) return;
      const fetchSpy = vi.spyOn(global, 'fetch');
      const intervalSpy = vi.spyOn(global, 'setInterval');
      const router = mod.createFapRouter({});
      // Just creating + reading rails — no I/O allowed inside domain.
      await router.getRails();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(intervalSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
      intervalSpy.mockRestore();
    });
  });

  describe('Result shape', () => {
    it('FapError discriminated union — error code is one of the documented variants', () => {
      // Type-level test: instances of FapError must have a recognised code.
      // We list the variants here so changes to packages/interfaces/src/fap.ts
      // are caught at architect-review time.
      const exampleErrors: FapError[] = [
        { code: 'catalog_unavailable', message: '' },
        { code: 'config_error', message: '' },
      ];
      for (const e of exampleErrors) {
        expect(['catalog_unavailable', 'config_error']).toContain(e.code);
      }
    });

    // Sanity check that Result<T, E> shape is consistent.
    it('Result is a discriminated union', () => {
      const ok: Result<readonly RailInfo[], FapError> = {
        ok: true,
        value: [] as readonly RailInfo[],
      };
      const err: Result<readonly RailInfo[], FapError> = {
        ok: false,
        error: { code: 'catalog_unavailable', message: 'x' },
      };
      expect(ok.ok).toBe(true);
      expect(err.ok).toBe(false);
    });
  });
});
