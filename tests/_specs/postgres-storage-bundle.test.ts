// TD-27 drift guard.
//
// Pre-existing ESM-resolution gap: `dist/products/01-registry/app/infra/
// postgres-storage.js` (compiled by tsc) has top-level
//   import { ZodAgentCard, ok, err, CRAWLER_SOURCES } from '@paxio/types';
//
// In the production Docker image (apps/back/server/main.cjs:107 → db.cjs →
// `await import(... postgres-storage.js)`), Node's ESM resolver fails:
//
//   container log (verified 2026-04-25):
//   "Cannot find package '@paxio/types' imported from
//    /app/dist/products/01-registry/app/infra/postgres-storage.js"
//   → createDbClient catches → returns no-op storage
//   → /health checks.database = 'skipped'
//
// Root cause: `@paxio/types` is a workspace package (pnpm symlink). The
// production image carries the dist/ tree but the symlink chain to
// `packages/types/dist` is missing — the file references a name that
// can't be resolved from its directory.
//
// Fix shape: same as M-L8.2 (TD-25). Run esbuild post-tsc to inline
// the @paxio/types deps into postgres-storage.js. Output is still ESM
// (db.cjs uses dynamic `import()` so ESM is fine), but workspace
// imports are bundled, so the resolver never has to look up
// '@paxio/types' at runtime.
//
// We assert ON THE BUNDLED OUTPUT, not the source. Source can keep
// importing — the build pipeline is what bundles.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const POSTGRES_STORAGE_DIST = join(
  REPO_ROOT,
  'dist',
  'products',
  '01-registry',
  'app',
  'infra',
  'postgres-storage.js',
);

describe('TD-27: dist/.../postgres-storage.js — workspace imports bundled', () => {
  // Skip-with-pass when dist not built — same convention as TD-24's
  // `existsSync` guard. CI runs `pnpm install && pnpm run build` before
  // vitest, so in CI this is always present. Local fresh clones see the
  // skip-with-pass.
  if (!existsSync(POSTGRES_STORAGE_DIST)) {
    it('skip — dist not built (run `pnpm run build` first)', () => {
      expect(true).toBe(true);
    });
    return;
  }

  const source = readFileSync(POSTGRES_STORAGE_DIST, 'utf8');

  it('exists at expected dist path', () => {
    expect(existsSync(POSTGRES_STORAGE_DIST)).toBe(true);
  });

  it('does NOT have top-level `import ... from "@paxio/types"`', () => {
    // Workspace imports MUST be bundled — the production Docker image
    // can't resolve `@paxio/types` from this file's location.
    // Negative match: no `import` statement that mentions @paxio/types.
    const hasWorkspaceImport = /^\s*import\s[\s\S]+?from\s+['"]@paxio\/types['"]/m.test(
      source,
    );
    expect(hasWorkspaceImport).toBe(false);
  });

  it('does NOT have top-level `import ... from "@paxio/interfaces"`', () => {
    // Same logic — any @paxio/* workspace import is a TD-27 regression.
    const hasInterfaceImport = /^\s*import\s[\s\S]+?from\s+['"]@paxio\/interfaces['"]/m.test(
      source,
    );
    expect(hasInterfaceImport).toBe(false);
  });

  it('does NOT have top-level `import ... from "@paxio/errors"`', () => {
    const hasErrorImport = /^\s*import\s[\s\S]+?from\s+['"]@paxio\/errors['"]/m.test(
      source,
    );
    expect(hasErrorImport).toBe(false);
  });

  it('still exports `createPostgresStorage` (factory not lost in bundling)', () => {
    // Whatever bundler approach backend-dev picks, the public symbol
    // must remain — db.cjs reaches for it after `await import()`.
    // Permit either named ESM export or a dual export-as form.
    const hasNamedExport =
      /export\s*(?:\{[^}]*\bcreatePostgresStorage\b[^}]*\}|const\s+createPostgresStorage)/.test(
        source,
      );
    expect(hasNamedExport).toBe(true);
  });

  it('Zod schema usage is preserved (inlined or referenced via bundled symbol)', () => {
    // The factory uses ZodAgentCard.parse(...) — that reference must still
    // exist somewhere in the bundled output. We don't dictate the exact
    // form, just that the pre-bundle behaviour is preserved.
    expect(source).toMatch(/ZodAgentCard|zodAgentCard|ZAgentCard|"agentCard"/i);
  });

  it('CRAWLER_SOURCES constant is reachable (bundled or referenced)', () => {
    // Same logic — the source uses CRAWLER_SOURCES, bundling must
    // preserve it (inlined or as a synthesised local).
    expect(source).toMatch(/CRAWLER_SOURCES|crawlerSources|CrawlerSource/);
  });
});
