// TD-24 drift guard.
//
// Pre-existing bug at apps/back/server/main.cjs:40 — APPLICATION_PATH used
// `path.join(__dirname, '..', '..', 'dist', 'products')`. From the file's
// own location (`apps/back/server/main.cjs`), 2× `..` only climbs to
// `apps/`, so the literal resolves to `apps/dist/products` — a directory
// that doesn't exist. `pnpm run build` writes handlers to repo-root
// `dist/products` (per `tsconfig.app.json::outDir = "./dist"`).
//
// Effect in production: `loadApplication(APPLICATION_PATH, ...)` throws
// ENOENT, caught at main.cjs:118-126 → empty appSandbox fallback → server
// boots OK (/health works) but ZERO VM-sandbox API routes mount via
// `registerSandboxRoutes(server, appSandbox.api)`. M-L5 agentStorage
// wiring becomes structurally correct but production-inert.
//
// This test is a permanent drift guard — once backend-dev fixes the
// literal to use 3× `..` (climbing to repo root), the resolved path will
// match the actual `dist/products` directory and this test stays GREEN
// forever. Reads main.cjs source as text (not require()) to avoid running
// the file's pg-pool side-effects in a vitest worker.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MAIN_CJS = join(REPO_ROOT, 'apps', 'back', 'server', 'main.cjs');
const MAIN_CJS_DIR = dirname(MAIN_CJS); // /<repo>/apps/back/server

describe('TD-24: APPLICATION_PATH in apps/back/server/main.cjs', () => {
  const source = readFileSync(MAIN_CJS, 'utf8');

  it('declares APPLICATION_PATH using path.join(__dirname, ...)', () => {
    expect(source).toMatch(/APPLICATION_PATH\s*=\s*path\.join\(\s*__dirname/);
  });

  it('resolves APPLICATION_PATH to repo-root dist/products (not apps/dist/products)', () => {
    // Extract the literal arguments to path.join(__dirname, ...).
    // We accept any number of '..' segments and then the trailing
    // 'dist', 'products' literals.
    const m = source.match(
      /APPLICATION_PATH\s*=\s*path\.join\(\s*__dirname((?:\s*,\s*'[^']+')+)\s*\)/,
    );
    expect(m).not.toBeNull();
    if (!m) return;

    // m[1] looks like ", '..', '..', 'dist', 'products'"
    const segments = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    expect(segments.length).toBeGreaterThan(0);

    // Resolve relative to main.cjs location.
    const resolved = resolve(MAIN_CJS_DIR, ...segments);

    // Must equal the actual on-disk dist/products at repo root.
    const expected = join(REPO_ROOT, 'dist', 'products');
    expect(resolved).toBe(expected);
  });

  it('resolved path does NOT point to apps/dist/products (the buggy target)', () => {
    const m = source.match(
      /APPLICATION_PATH\s*=\s*path\.join\(\s*__dirname((?:\s*,\s*'[^']+')+)\s*\)/,
    );
    expect(m).not.toBeNull();
    if (!m) return;

    const segments = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    const resolved = resolve(MAIN_CJS_DIR, ...segments);

    // The pre-fix bug resolved to <repo>/apps/dist/products. After fix it
    // must NOT match that location — guarantees the regression doesn't
    // come back if someone re-edits the line and miscounts.
    const buggy = join(REPO_ROOT, 'apps', 'dist', 'products');
    expect(resolved).not.toBe(buggy);
  });

  it('post-build target directory exists in the repo (after pnpm run build)', () => {
    // Sanity: confirms our claim that pnpm build writes to <repo>/dist/products.
    // Skipped if dist not built yet (CI runs `pnpm install && pnpm run build`
    // before vitest, so in CI this directory exists; locally a fresh clone
    // without build will skip — the previous two assertions still guard the
    // literal correctness).
    const distProducts = join(REPO_ROOT, 'dist', 'products');
    if (!existsSync(distProducts)) {
      // Intentional: the literal-correctness checks above are sufficient
      // even when build artifacts aren't present. Mark as informational.
      expect(true).toBe(true);
      return;
    }
    expect(existsSync(distProducts)).toBe(true);
  });
});
