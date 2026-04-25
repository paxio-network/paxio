'use strict';

// VM Sandbox loader.
// Ported from Olympus server/src/loader.cjs (generic, no changes needed).
//
// Loads .js files from app/ into VM sandbox with frozen context.
// Three layers: lib → domain → api. Each layer sees only previous layers.

const crypto = require('node:crypto');
const fsp = require('node:fs').promises;
const vm = require('node:vm');
const path = require('node:path');

const OPTIONS = {
  timeout: 5000,
  displayErrors: false,
};

// Loads a single .js file under the VM sandbox. Two file shapes coexist:
//
//  1. Hand-written `api/*.js` — eOlympus-style IIFE. The file's last
//     expression IS the exports literal (e.g. `({ httpMethod, path,
//     method })`). Wrapping in `'use strict';\n{\n${src}\n}` makes
//     `vm.Script.runInContext` return that literal directly.
//
//  2. esbuild-bundled `domain/*.js` — produced by `scripts/bundle-vm-
//     modules.mjs` post-tsc. Output is `var __paxio_module = (() => {
//     ... })();\n__paxio_module;\n`. Inside the wrap the trailing
//     `__paxio_module;` is the last expression statement, so the
//     wrapped block evaluates to the bundle's exports object. As an
//     extra safety net we also read `__paxio_module` off the context
//     (esbuild's `var` assigns onto the script's global), preferring
//     it when the script's own return value is undefined.
//
// The sandbox slot `__paxio_module: undefined` exists so the bundled
// IIFE has a writable global to bind onto — vm.createContext freezes
// the *prototype chain*, not the slot, when the slot is pre-declared.
const load = async (filePath, sandbox) => {
  const src = await fsp.readFile(filePath, 'utf8');
  const code = `'use strict';\n{\n${src}\n}`;
  const script = new vm.Script(code, {
    ...OPTIONS,
    lineOffset: -2,
  });
  const sandboxWithSlot = { ...sandbox, __paxio_module: undefined };
  const context = vm.createContext(sandboxWithSlot);
  const result = script.runInContext(context, OPTIONS);
  // For hand-written api/*.js result IS the IIFE literal.
  // For bundled domain/*.js result is also __paxio_module (trailing
  // expression appended by bundle-vm-modules.mjs); fall back to the
  // context slot if for some reason the trailing expression evaluates
  // to undefined first (e.g. early bundler version without suffix).
  return result ?? sandboxWithSlot.__paxio_module;
};

const loadDir = async (dir, sandbox) => {
  const files = await fsp.readdir(dir);
  const container = {};
  for (const fileName of files) {
    if (!fileName.endsWith('.js')) continue;
    if (fileName.startsWith('.')) continue;
    const filePath = path.join(dir, fileName);
    const name = path.basename(fileName, '.js');
    container[name] = await load(filePath, sandbox);
  }
  return container;
};

const loadDeepDir = async (dir, sandbox) => {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const container = {};
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      container[entry.name] = await loadDeepDir(fullPath, sandbox);
    } else if (entry.name.endsWith('.js')) {
      const name = path.basename(entry.name, '.js');
      container[name] = await load(fullPath, sandbox);
    }
  }
  return container;
};

const loadApplication = async (appPath, serverContext, options = {}) => {
  const {
    console: logger,
    config,
    errors,
    telemetry,
    agentStorage,
  } = serverContext;

  // Composition-root hook. Called after domain modules are loaded but
  // BEFORE the outer domain object is frozen and BEFORE api handlers
  // are loaded. The callback receives the raw domain tree (loader's
  // file-stem nesting still in place — `domain[product][file-stem]`)
  // and must return the WIRED tree that api handlers will see at
  // call-time (e.g. `domain[product].<service>`). Returning the same
  // tree (or omitting the option) means no wiring — handlers see raw
  // factories.
  //
  // The callback runs inside loader so the returned tree can be frozen
  // alongside lib/api in one pass. Without this hook main.cjs can't
  // affect what VM handlers see, since loader builds its own internal
  // sandbox and never re-exports it.
  const { wireProducts } = options;

  // Base sandbox — available to all VM layers
  const sandbox = {
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    AbortController,
    Buffer,
    URL,
    URLSearchParams,
    console: Object.freeze(logger),
    crypto: Object.freeze(crypto),
    config: Object.freeze(config),
    errors: Object.freeze(errors),
    telemetry: Object.freeze(telemetry),
    agentStorage: Object.freeze(agentStorage ?? null),
  };

  // Layer 1: lib (permissions, validation helpers, Zod schemas)
  // Try top-level lib/ first, then per-product lib/
  const libPath = path.join(appPath, 'lib');
  let lib = {};
  try {
    lib = await loadDir(libPath, sandbox);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  // Also scan lib/ inside each product's app/
  const productsEntries = await fsp.readdir(appPath, { withFileTypes: true });
  for (const entry of productsEntries) {
    if (!entry.isDirectory()) continue;
    const productAppLib = path.join(appPath, entry.name, 'app', 'lib');
    try {
      const productLib = await loadDir(productAppLib, sandbox);
      for (const [name, module] of Object.entries(productLib)) {
        lib[`${entry.name}/${name}`] = module;
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
  sandbox.lib = Object.freeze(lib);

  // Layer 2: domain (pure business logic — per-FA subdomains)
  const domainPath = path.join(appPath, 'domain');
  let domain = {};
  try {
    domain = await loadDeepDir(domainPath, sandbox);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  // Also scan domain/ inside each product's app/
  for (const entry of productsEntries) {
    if (!entry.isDirectory()) continue;
    const productAppDomain = path.join(appPath, entry.name, 'app', 'domain');
    try {
      const productDomain = await loadDeepDir(productAppDomain, sandbox);
      // Per-product NOT frozen here — composition-root callback (above)
      // may rebuild slots; final freeze happens after wireProducts runs.
      domain[entry.name] = productDomain;
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  // Composition root — produces the wired domain tree the VM handlers
  // see. If no callback was supplied, raw factory tree is exposed.
  const wiredDomain = wireProducts
    ? wireProducts(domain, serverContext)
    : domain;
  sandbox.domain = Object.freeze(wiredDomain);

  // Layer 3: api (HTTP handlers — also per-product)
  const apiPath = path.join(appPath, 'api');
  let api = {};
  try {
    api = await loadDeepDir(apiPath, sandbox);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  // Also scan api/ inside each product's app/
  for (const entry of productsEntries) {
    if (!entry.isDirectory()) continue;
    const productAppApi = path.join(appPath, entry.name, 'app', 'api');
    try {
      const productApi = await loadDeepDir(productAppApi, sandbox);
      api[entry.name] = Object.freeze(productApi);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
  sandbox.api = Object.freeze(api);

  // Return the WIRED domain tree (= what's on sandbox.domain) so callers
  // see the same view as VM handlers. Falls back to raw if no callback.
  return Object.freeze({ lib, domain: wiredDomain, api, config });
};

module.exports = { load, loadDir, loadDeepDir, loadApplication };
