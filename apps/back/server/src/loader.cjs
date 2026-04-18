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

const load = async (filePath, sandbox) => {
  const src = await fsp.readFile(filePath, 'utf8');
  const code = `'use strict';\n{\n${src}\n}`;
  const script = new vm.Script(code, {
    ...OPTIONS,
    lineOffset: -2,
  });
  const context = vm.createContext(Object.freeze({ ...sandbox }));
  return script.runInContext(context, OPTIONS);
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

const loadApplication = async (appPath, serverContext) => {
  const { console: logger, config, errors, telemetry } = serverContext;

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
  };

  // Layer 1: lib (permissions, validation helpers, Zod schemas)
  const libPath = path.join(appPath, 'lib');
  let lib = {};
  try {
    lib = await loadDir(libPath, sandbox);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
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
  sandbox.domain = Object.freeze(domain);

  // Layer 3: api (HTTP handlers)
  const apiPath = path.join(appPath, 'api');
  let api = {};
  try {
    api = await loadDeepDir(apiPath, sandbox);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  sandbox.api = Object.freeze(api);

  return Object.freeze({ lib, domain, api, config });
};

module.exports = { load, loadDir, loadDeepDir, loadApplication };
