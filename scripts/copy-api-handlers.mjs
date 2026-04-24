#!/usr/bin/env node
// TD-17: copy VM-sandbox handlers from source into `dist/`.
//
// `tsconfig.app.json` `include` covers `.ts` only, so `.js` files under
// `products/*/app/api/` are not emitted. The Fastify server's VM loader
// (`apps/back/server/src/loader.cjs`) scans `dist/products/<fa>/app/api/`
// for `*.js` and mounts each as a route — an empty dir means 404 in prod.
//
// This script mirrors every `products/*/app/api/**/*.js` into
// `dist/<same-path>` preserving directory structure.
//
// Runs as the post-tsc step of `pnpm build`.

import { mkdir, copyFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const SRC_GLOB_ROOT = join(REPO_ROOT, 'products');
const DIST_ROOT = join(REPO_ROOT, 'dist');

/** Walk directory recursively, yielding absolute file paths. */
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

async function main() {
  // Discover `products/<fa>/app/api/` directories.
  let products;
  try {
    products = await readdir(SRC_GLOB_ROOT, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('[copy-api-handlers] no products/ dir — nothing to copy');
      return;
    }
    throw err;
  }

  let copied = 0;
  for (const product of products) {
    if (!product.isDirectory()) continue;
    const apiDir = join(SRC_GLOB_ROOT, product.name, 'app', 'api');
    try {
      const s = await stat(apiDir);
      if (!s.isDirectory()) continue;
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      throw err;
    }

    for await (const file of walk(apiDir)) {
      if (!file.endsWith('.js')) continue;
      const rel = relative(REPO_ROOT, file);
      const dest = join(DIST_ROOT, rel);
      await mkdir(dirname(dest), { recursive: true });
      await copyFile(file, dest);
      copied += 1;
    }
  }

  console.log(`[copy-api-handlers] copied ${copied} handler(s) into dist/`);
}

main().catch((err) => {
  console.error('[copy-api-handlers] fatal:', err);
  process.exit(1);
});
