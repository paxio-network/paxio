/**
 * RED tests for TD-08 (frontend smoke tests dead+buggy) and TD-09 (ESLint
 * build-gate bypassed).
 *
 * Owner: frontend-dev — these tests direct the cleanup per tech-debt.md.
 *
 * TD-08 failure modes to exercise:
 *   1. `existsSync` imported from `node:path` — wrong module; `node:path` has
 *      no such export. Correct module is `node:fs`.
 *   2. Relative path `'../../app/page'` traverses two levels up from
 *      `apps/frontend/<name>/tests/smoke.test.tsx`, landing in
 *      `apps/frontend/<name>/../../app/page` = `apps/app/page`. The correct
 *      path is `'../app/page'`.
 *   3. Root `vitest.config.ts` include pattern matches `.test.ts` only (not
 *      `.test.tsx`) AND explicitly excludes `apps/frontend/**`. Either the
 *      root config has to include `.tsx` + drop the exclude, or each
 *      `apps/frontend/<app>/` has to have its own `vitest.config.ts`.
 *
 * TD-09 failure modes:
 *   1. Every `apps/frontend/<name>/next.config.ts` declares
 *      `eslint: { ignoreDuringBuilds: true }` — band-aid. Must be removed.
 *   2. Each app must have either an `.eslintrc.json` (extends
 *      `next/core-web-vitals`) or an `eslint.config.*` flat config
 *      (Next.js 15 supports both; architect leaves the choice to frontend-dev).
 *
 * After frontend-dev fix:
 *   - 8/8 TD-08 tests GREEN
 *   - 8/8 TD-09 tests GREEN
 *   - `pnpm --filter @paxio/<name>-app test` actually runs smoke
 *     and returns passing results (not "No test files found")
 *   - `pnpm turbo run build --filter='./apps/frontend/*'` still passes
 *     WITHOUT ignoreDuringBuilds
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const APPS = [
  'landing',
  'registry',
  'pay',
  'radar',
  'intel',
  'docs',
  'wallet',
  'fleet',
] as const;

// ───────────────────────────────────────────────────────────────────
// TD-08 — Frontend smoke tests (8 apps × 3 checks = 24 assertions)
// ───────────────────────────────────────────────────────────────────

describe('TD-08: frontend smoke tests must be live, not dead code', () => {
  for (const app of APPS) {
    describe(`apps/frontend/${app}/`, () => {
      const smokePath = join(ROOT, 'apps', 'frontend', app, 'tests', 'smoke.test.tsx');

      it(`smoke.test.tsx exists`, () => {
        expect(existsSync(smokePath)).toBe(true);
      });

      it(`does NOT import existsSync from 'node:path' (wrong module, should be 'node:fs')`, () => {
        if (!existsSync(smokePath)) return; // skip — "exists" test catches it
        const src = readFileSync(smokePath, 'utf8');

        // Any existsSync symbol referenced AND imported must not come from node:path
        const hasExistsSync = /\bexistsSync\b/.test(src);
        if (!hasExistsSync) return; // file might not use existsSync at all — OK

        // If existsSync IS used, it must be imported from 'node:fs'
        const importsFromFs = /from\s+['"]node:fs['"]/.test(src) || /from\s+['"]fs['"]/.test(src);
        const importsFromPath = /from\s+['"]node:path['"]/.test(src);

        if (importsFromPath) {
          // Verify existsSync is NOT in the node:path import block
          const pathImportMatch = src.match(/import\s*\{([^}]+)\}\s*from\s+['"]node:path['"]/);
          const pathImportedNames = pathImportMatch?.[1] ?? '';
          expect(pathImportedNames).not.toMatch(/\bexistsSync\b/);
        }

        expect(importsFromFs).toBe(true);
      });

      it(`relative import path points to '../app/...' (NOT '../../app/...')`, () => {
        if (!existsSync(smokePath)) return;
        const src = readFileSync(smokePath, 'utf8');

        // No '../../app/' traversal (that escapes apps/frontend/<app>/ into apps/)
        expect(src).not.toMatch(/['"]\.\.\/\.\.\/app\//);

        // If the file imports from '../app/' — that's correct
        const hasAppImport = /['"]\.\.\/app\//.test(src) || /['"]\.\.\/app['"]/.test(src);
        if (/import\s*\(\s*['"].*\/app\//.test(src) || /from\s+['"].*\/app\//.test(src)) {
          expect(hasAppImport).toBe(true);
        }
      });
    });
  }
});

// ───────────────────────────────────────────────────────────────────
// TD-09 — ESLint build-gate must not be bypassed (8 apps × 2 checks)
// ───────────────────────────────────────────────────────────────────

describe('TD-09: next.config.ts must not disable ESLint at build time', () => {
  for (const app of APPS) {
    describe(`apps/frontend/${app}/`, () => {
      const nextCfg = join(ROOT, 'apps', 'frontend', app, 'next.config.ts');

      it(`next.config.ts does NOT set eslint.ignoreDuringBuilds: true`, () => {
        if (!existsSync(nextCfg)) {
          throw new Error(`missing ${nextCfg}`);
        }
        const src = readFileSync(nextCfg, 'utf8');

        // Band-aid pattern that TD-09 outlaws
        expect(src).not.toMatch(/ignoreDuringBuilds\s*:\s*true/);
      });

      it(`has an ESLint config file (.eslintrc.json | .eslintrc.cjs | eslint.config.*)`, () => {
        const appRoot = join(ROOT, 'apps', 'frontend', app);
        const candidates = [
          '.eslintrc.json',
          '.eslintrc.cjs',
          '.eslintrc.js',
          'eslint.config.js',
          'eslint.config.mjs',
          'eslint.config.ts',
        ];
        const found = candidates.some((name) => existsSync(join(appRoot, name)));
        expect(found).toBe(true);
      });
    });
  }
});
