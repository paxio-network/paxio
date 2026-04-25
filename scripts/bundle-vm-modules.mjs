#!/usr/bin/env node
// TD-25: bundle compiled product domain `.js` files into self-contained
// IIFE format so the Fastify server's VM sandbox loader (`vm.Script`) can
// evaluate them.
//
// Why this script exists:
// - `tsconfig.base.json::module = "ESNext"` causes `tsc` to emit
//   top-level `import`/`export` statements. `vm.Script` wraps source in
//   `'use strict';\n{\n${src}\n}` — top-level `import` is illegal inside
//   a block → `SyntaxError: Cannot use import statement outside a
//   module` → main.cjs falls back to empty sandbox → every `/api/*`
//   route returns 404.
// - Hand-written API handlers in `products/*/app/api/*.js` follow the
//   eOlympus VM-sandbox IIFE convention (last expression is the exports
//   literal). Compiled domain `.ts` files do not — they emit ESM
//   syntax. This script reconciles them post-`tsc`.
//
// Strategy (Option C from M-L8.2 milestone):
// 1. Walk `dist/products/*/app/domain/**/*.js`.
// 2. For each file, run esbuild with `bundle: true, format: 'iife',
//    globalName: '__paxio_module'`. esbuild inlines all `@paxio/*`
//    imports + relative imports into a single self-contained IIFE
//    assigned to `var __paxio_module = (() => { ... })();`.
// 3. Append `\n__paxio_module;` so the bundle's last expression
//    statement IS the module exports object — `vm.Script.runInContext`
//    returns the value of the last completed expression in the wrapped
//    block, so the loader receives the exports directly.
//
// Hand-written `api/*.js` files are NOT touched (script glob is
// `domain/**` only). copy-api-handlers.mjs places them in dist/ first;
// they remain plain IIFE expressions that vm.Script evaluates as-is.
//
// Runs as the LAST step of `pnpm build` — after `tsc` and after
// `copy-api-handlers.mjs`.

import { build } from 'esbuild';
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const DIST_PRODUCTS = join(REPO_ROOT, 'dist', 'products');

/** Walk a directory recursively, yielding absolute file paths. */
async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

/** Collect every `dist/products/<fa>/app/domain/**\/*.js` path. */
async function collectDomainFiles() {
  const files = [];
  if (!existsSync(DIST_PRODUCTS)) return files;
  const products = await readdir(DIST_PRODUCTS, { withFileTypes: true });
  for (const product of products) {
    if (!product.isDirectory()) continue;
    const domainDir = join(DIST_PRODUCTS, product.name, 'app', 'domain');
    try {
      const s = await stat(domainDir);
      if (!s.isDirectory()) continue;
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      throw err;
    }
    for await (const file of walk(domainDir)) {
      if (file.endsWith('.js')) files.push(file);
    }
  }
  return files;
}

/** Find every per-product `node_modules` dir for esbuild resolution. */
async function collectNodePaths() {
  const paths = [join(REPO_ROOT, 'node_modules')];
  const productsDir = join(REPO_ROOT, 'products');
  try {
    const products = await readdir(productsDir, { withFileTypes: true });
    for (const product of products) {
      if (!product.isDirectory()) continue;
      const nm = join(productsDir, product.name, 'node_modules');
      if (existsSync(nm)) paths.push(nm);
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  return paths;
}

/** Map `@paxio/<name>` package import to its compiled `dist/packages/<name>/src/index.js`. */
function buildPackageAliases() {
  return {
    '@paxio/types': join(
      REPO_ROOT,
      'dist',
      'packages',
      'types',
      'src',
      'index.js',
    ),
    '@paxio/interfaces': join(
      REPO_ROOT,
      'dist',
      'packages',
      'interfaces',
      'src',
      'index.js',
    ),
    '@paxio/errors': join(
      REPO_ROOT,
      'dist',
      'packages',
      'errors',
      'src',
      'index.js',
    ),
    '@paxio/utils': join(
      REPO_ROOT,
      'dist',
      'packages',
      'utils',
      'src',
      'index.js',
    ),
    '@paxio/utils/clock': join(
      REPO_ROOT,
      'dist',
      'packages',
      'utils',
      'src',
      'clock.js',
    ),
    '@paxio/utils/logger': join(
      REPO_ROOT,
      'dist',
      'packages',
      'utils',
      'src',
      'logger.js',
    ),
  };
}

/** esbuild plugin: rewrite `node:*` imports to read from the VM sandbox
 *  globals (loader.cjs injects `crypto`, etc., as frozen sandbox slots).
 *  Without this, esbuild externalizes `node:crypto` → emits a `__require`
 *  shim → throws `Dynamic require of "node:crypto" is not supported` at
 *  runtime because vm.Script has no `require`. */
const nodeBuiltinsAsSandboxGlobals = {
  name: 'node-builtins-as-sandbox-globals',
  setup(build) {
    build.onResolve({ filter: /^node:/ }, (args) => ({
      path: args.path,
      namespace: 'sandbox-node-builtin',
    }));
    build.onLoad(
      { filter: /.*/, namespace: 'sandbox-node-builtin' },
      (args) => {
        const moduleName = args.path.replace(/^node:/, '');
        // The sandbox loader injects `crypto` (and other built-ins
        // selectively). Re-export the entire global so destructured
        // imports like `import { createHash } from 'node:crypto'`
        // resolve to `crypto.createHash`.
        return {
          contents: `module.exports = globalThis.${moduleName};`,
          loader: 'js',
        };
      },
    );
  },
};

async function bundleFile(file, alias, nodePaths) {
  await build({
    entryPoints: [file],
    bundle: true,
    format: 'iife',
    globalName: '__paxio_module',
    platform: 'node',
    outfile: file,
    allowOverwrite: true,
    write: true,
    // Domain code never reaches Fastify/pino/pg at runtime — VM sandbox
    // hands it injected `console`/`telemetry` instead. Leave these
    // unresolved (esbuild keeps the require/import as-is; never reached).
    external: ['fastify', 'pino', 'pg', 'pino-pretty'],
    alias,
    nodePaths,
    plugins: [nodeBuiltinsAsSandboxGlobals],
    minify: false,
    sourcemap: false,
    logLevel: 'silent',
  });

  // esbuild's IIFE output is `var __paxio_module = (() => { ... })();`
  // with no trailing expression. Append one so the wrapped block
  // (`'use strict';\n{\n${src}\n}`) returns __paxio_module as its value.
  const bundled = await readFile(file, 'utf8');
  await writeFile(file, `${bundled}\n__paxio_module;\n`, 'utf8');
}

async function main() {
  const files = await collectDomainFiles();
  if (files.length === 0) {
    console.log('[bundle-vm-modules] no domain files found in dist/');
    return;
  }
  const alias = buildPackageAliases();
  const nodePaths = await collectNodePaths();
  for (const file of files) {
    await bundleFile(file, alias, nodePaths);
  }
  console.log(
    `[bundle-vm-modules] processed ${files.length} domain files in dist/`,
  );
}

main().catch((err) => {
  console.error('[bundle-vm-modules] fatal:', err);
  process.exit(1);
});
