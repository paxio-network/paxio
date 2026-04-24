/**
 * TD-18 RED spec — `@paxio/*` imports in each frontend app must be declared
 * in that app's `package.json::dependencies`.
 *
 * WHY: TS resolves `@paxio/types` через `tsconfig.base.json::paths` +
 * transitive workspace symlinks (e.g. `@paxio/ui` peers reach it) — so
 * `pnpm typecheck` and `vitest` pass. But Next.js has its OWN module
 * resolver which does NOT traverse undeclared transitive workspace graphs,
 * so `next build` fails with `Cannot find module '@paxio/types'`.
 *
 * Discovered 2026-04-24 during M-L0-impl review. Root cause: M01c commit
 * bf8176f introduced `apps/frontend/landing/app/sections/03-radar.tsx` with
 * `import type { HeatGrid } from '@paxio/types'` but never added the
 * package to `apps/frontend/landing/package.json::dependencies`.
 *
 * Fix: each @paxio/pkg imported by any apps/frontend/app/tsx source file
 * must be declared in apps/frontend/app/package.json::dependencies with
 * workspace:* version.
 *
 * This spec scans ALL 8 frontend apps + all imports, not just the known
 * landing case. Architect intentionally makes this spec comprehensive so it
 * serves as permanent drift-guard: future apps that forget to declare a dep
 * will fail this test the moment they add an import.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FRONTEND_ROOT = join(process.cwd(), 'apps/frontend');

// Discover all frontend apps (directories under apps/frontend/)
function listApps(): string[] {
  if (!existsSync(FRONTEND_ROOT)) return [];
  return readdirSync(FRONTEND_ROOT)
    .filter((d) => {
      const p = join(FRONTEND_ROOT, d);
      return (
        statSync(p).isDirectory() && existsSync(join(p, 'package.json'))
      );
    })
    .sort();
}

// Recursively collect all .tsx/.ts source files under a directory
function collectSources(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'dist')
      continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      out.push(...collectSources(p));
    } else if (/\.(tsx|ts)$/.test(entry) && !/\.d\.ts$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

// Extract `@paxio/<pkg>` names (non-app suffix) from a source file
const IMPORT_RE =
  /(?:from|import)\s+['"](@paxio\/[a-z0-9-]+)['"]/g;

function extractPaxioImports(src: string): Set<string> {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  // Reset regex state
  const re = new RegExp(IMPORT_RE.source, 'g');
  while ((m = re.exec(src)) !== null) {
    found.add(m[1]);
  }
  return found;
}

// Read declared deps from an app's package.json
interface PkgJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}
function readPkgJson(appDir: string): PkgJson {
  const p = join(appDir, 'package.json');
  return JSON.parse(readFileSync(p, 'utf8')) as PkgJson;
}

describe('TD-18 — frontend apps declare every `@paxio/*` they import', () => {
  const apps = listApps();

  it('discovers at least one frontend app', () => {
    expect(apps.length).toBeGreaterThan(0);
  });

  describe.each(apps.map((a) => ({ app: a })))('$app', ({ app }) => {
    const appDir = join(FRONTEND_ROOT, app);
    const sources = collectSources(join(appDir, 'app'));
    const pkg = readPkgJson(appDir);
    const declared = new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ]);

    // Aggregate imports across every source file
    const imported = new Set<string>();
    for (const f of sources) {
      const src = readFileSync(f, 'utf8');
      for (const imp of extractPaxioImports(src)) imported.add(imp);
    }

    it('has a package.json with a name', () => {
      expect(pkg.name).toBeTruthy();
    });

    // One test per imported package — fine-grained failure signal
    const importedArr = Array.from(imported).sort();
    if (importedArr.length === 0) {
      it('has no @paxio/* imports (nothing to check)', () => {
        expect(imported.size).toBe(0);
      });
    } else {
      describe.each(importedArr.map((p) => ({ pkg: p })))(
        'imports $pkg',
        ({ pkg: importedPkg }) => {
          it(`declares ${importedPkg} in package.json`, () => {
            expect(declared.has(importedPkg)).toBe(true);
          });
        },
      );
    }
  });
});
