// TD-25 RED spec — VM sandbox loader can evaluate compiled domain files.
//
// After TD-24 path fix, `loadApplication` reaches the right `dist/products/`
// directory, but `apps/back/server/src/loader.cjs:19-28` uses `vm.Script`
// (sync, CJS-only) to evaluate `.js` files. The compiled output of the
// product domain `.ts` files contains top-level ESM `import` statements
// because `tsconfig.base.json::module = "ESNext"`. vm.Script wraps source
// in `'use strict';\n{\n${src}\n}` — top-level `import` is illegal inside
// a block → `SyntaxError: Cannot use import statement outside a module`
// → main.cjs:118-126 catches it → empty sandbox fallback →
// `registerSandboxRoutes` mounts ZERO routes → every `/api/*` returns 404.
//
// This RED spec encodes the contract regardless of which fix path
// backend-dev chooses (esbuild bundle / tsc CJS emit / source refactor).
// Whatever the implementation, after the fix:
//   1. Compiled `.js` files in `dist/products/<fa>/app/domain/` MUST be
//      evaluable by `vm.Script` (no top-level imports/exports left).
//   2. Evaluated result MUST expose the expected factory function name.
//
// We don't load via main.cjs's own `loadApplication` (would require pg-pool
// + Fastify server boot). Instead the test boots a minimal vm.Context
// matching the loader's wrap and asserts the eval succeeds.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script, createContext } from 'node:vm';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST_PRODUCTS = join(REPO_ROOT, 'dist', 'products');

// Domain files that backend handlers depend on. If any of these can't be
// loaded by vm.Script, the corresponding handler returns 404 in production.
const REQUIRED_DOMAIN_FILES = [
  'dist/products/07-intelligence/app/domain/landing-stats.js',
  'dist/products/07-intelligence/app/domain/network-snapshot-builder.js',
];

const wrapForLoader = (src: string): string => `'use strict';\n{\n${src}\n}`;

const minimalSandbox = () =>
  Object.freeze({
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    AbortController,
    Buffer,
    URL,
    URLSearchParams,
    console: Object.freeze({
      log: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    }),
    crypto: Object.freeze({}),
    config: Object.freeze({}),
    errors: Object.freeze({}),
    telemetry: Object.freeze({ broadcast: () => {} }),
    agentStorage: Object.freeze(null),
    lib: Object.freeze({}),
    domain: Object.freeze({}),
    api: Object.freeze({}),
  });

describe('TD-25: VM sandbox loader can evaluate compiled product domain files', () => {
  beforeAll(() => {
    if (!existsSync(DIST_PRODUCTS)) {
      throw new Error(
        `${DIST_PRODUCTS} does not exist — run 'pnpm run build' before this spec.`,
      );
    }
  });

  describe.each(REQUIRED_DOMAIN_FILES)('%s', (relPath) => {
    const fullPath = join(REPO_ROOT, relPath);

    it('exists in dist/ (TD-17 build pipeline)', () => {
      expect(existsSync(fullPath)).toBe(true);
    });

    it('compiled output has NO top-level `import` statement', () => {
      const src = readFileSync(fullPath, 'utf8');
      // Match `import` at start of line (after optional whitespace) followed
      // by either `{` or `*` or identifier — covers `import X`, `import {`,
      // `import * as X`, `import type` etc. import.meta and dynamic
      // import() are method-call syntax, NOT top-level statements.
      const topLevelImport = /^[ \t]*import[ \t]+(?:\{|\*|[A-Za-z_$])/m;
      expect(
        src,
        `${relPath} contains a top-level import — vm.Script cannot evaluate this`,
      ).not.toMatch(topLevelImport);
    });

    it('compiled output has NO top-level `export` statement', () => {
      const src = readFileSync(fullPath, 'utf8');
      const topLevelExport = /^[ \t]*export[ \t]+(?:default|\{|const|let|var|function|class|async|type|interface)/m;
      expect(
        src,
        `${relPath} contains a top-level export — vm.Script eval would not return its value`,
      ).not.toMatch(topLevelExport);
    });

    it('vm.Script can construct (no SyntaxError)', () => {
      const src = readFileSync(fullPath, 'utf8');
      const code = wrapForLoader(src);
      // Note: `displayErrors: false` is a valid Node runtime option for
      // vm.Script but is missing from the current `ScriptOptions` typing
      // in `@types/node`. Default (display on stderr) is fine for unit
      // tests — keeps the type checker happy without an `as any` cast.
      expect(() => new Script(code)).not.toThrow();
    });

    it('vm.Script.runInContext produces a defined value (loader contract)', () => {
      // The loader calls `script.runInContext(context)` and expects the
      // returned value to be the module's exports — typically a factory
      // function or an object literal. The wrap `{ ... }` runs the source
      // inside a block, V8 returns the value of the last expression
      // statement in the block.
      const src = readFileSync(fullPath, 'utf8');
      const code = wrapForLoader(src);
      const script = new Script(code);
      const context = createContext({ ...minimalSandbox() });
      const result = script.runInContext(context, { timeout: 5000 });
      expect(
        result,
        `${relPath} eval returned undefined — loader cannot expose this module`,
      ).toBeDefined();
    });
  });

  it('VM-evaluated landing-stats exposes a factory named createLandingStats', () => {
    const src = readFileSync(
      join(REPO_ROOT, 'dist/products/07-intelligence/app/domain/landing-stats.js'),
      'utf8',
    );
    const code = wrapForLoader(src);
    const script = new Script(code);
    const context = createContext({ ...minimalSandbox() });
    const result = script.runInContext(context, { timeout: 5000 });

    // Result shape can be:
    //   - a function `createLandingStats` (if file ends with `createLandingStats`)
    //   - an object `{ createLandingStats }` (if file ends with the literal)
    //   - via globalThis assignment (if loader wraps differently)
    // Backend-dev picks the canonical shape. Test just checks one exists.
    const hasFactory =
      typeof result === 'function' && result.name === 'createLandingStats'
        ? true
        : typeof result === 'object' && result !== null && 'createLandingStats' in result
          ? true
          : typeof (context as Record<string, unknown>)['createLandingStats'] === 'function';

    expect(
      hasFactory,
      `landing-stats.js eval did not surface createLandingStats — result was ${typeof result}, ${
        typeof result === 'object' && result !== null
          ? `keys=${Object.keys(result).join(',')}`
          : 'no factory found'
      }`,
    ).toBe(true);
  });
});
