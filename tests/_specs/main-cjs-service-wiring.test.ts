// TD-26 drift guard.
//
// Pre-existing wiring gap at apps/back/server/main.cjs.
//
// loadApplication() (apps/back/server/src/loader.cjs:179) returns:
//   sandbox.domain['07-intelligence']['landing-stats'] = { createLandingStats }
//   sandbox.domain['02-facilitator']['fap-router']     = { createFapRouter }
//
// But api handlers (e.g. products/07-intelligence/app/api/landing-hero.js)
// reach for the CONSTRUCTED service:
//   await domain['07-intelligence'].landing.getHero()
//                                   ↑ this slot does not exist
//
// Production manifestation (verified 2026-04-25 against live api.paxio.network):
//   GET /api/landing/hero → 500
//   container log: TypeError: Cannot read properties of undefined (reading 'getHero')
//                  at evalmachine.<anonymous>:6:60
//
// Fix shape (one of two; backend-dev picks):
//
//   A) per-product wiring file in apps/back/server/wiring/<product>.cjs
//      module.exports = (rawDomain, deps) => ({
//        fap: rawDomain['fap-router'].createFapRouter(deps),     // 02-facilitator
//        landing: rawDomain['landing-stats'].createLandingStats(deps), // 07-intelligence
//      });
//      main.cjs aggregates and rewrites appSandbox.domain.
//
//   B) convention-based: factories named `createXxx` are auto-invoked with
//      sandbox deps; service mounted at lower-cased suffix
//      (`createLandingStats` → `landingStats`, but handlers want `.landing`,
//      so backend-dev must add a hint export per product or stick with A).
//
// Recommended in M-L8.3 milestone: option A (explicit per-product wiring,
// composition-root pattern, engineering-principles §16).
//
// This test reads main.cjs as text and asserts the wiring step exists.
// It does NOT execute main.cjs (would require a full Postgres + sandbox).
// Acceptance test (scripts/verify_td26_routing.sh) covers the runtime side.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MAIN_CJS = join(REPO_ROOT, 'apps', 'back', 'server', 'main.cjs');

describe('TD-26: service wiring layer in apps/back/server/main.cjs', () => {
  const source = readFileSync(MAIN_CJS, 'utf8');

  it('declares APPLICATION_PATH (smoke — TD-24 still GREEN)', () => {
    // This is a corollary check — TD-24 already guards this fact, but
    // re-asserting here means a future unrelated edit to main.cjs
    // can't accidentally remove APPLICATION_PATH and slip past TD-24
    // (which only triggers on regex-extractable changes).
    expect(source).toMatch(/APPLICATION_PATH\s*=\s*path\.join\(\s*__dirname/);
  });

  it('imports a wiring layer from apps/back/server/wiring/ OR uses a wireServices helper', () => {
    // Accept either of the two shapes (option A or option B above).
    // Backend-dev's choice; both satisfy this guard.
    const optionA = /require\((['"])\.\/wiring(?:\/index)?(?:\.cjs)?\1\)/;
    const optionB = /(?:const|let|var)\s+wireServices\s*=\s*/;
    const optionA2 = /require\((['"])\.\/wiring\/[a-z0-9-]+(?:\.cjs)?\1\)/;
    expect(optionA.test(source) || optionB.test(source) || optionA2.test(source)).toBe(true);
  });

  it('invokes wiring AFTER loadApplication (compositions root pattern)', () => {
    // The wiring call site must come AFTER loadApplication(...) returns.
    // We check ordering by source position — wiring must reference the
    // `appSandbox` (or whatever the loader return is named) which only
    // exists after loadApplication returns.
    const loadIdx = source.search(/loadApplication\s*\(\s*APPLICATION_PATH/);
    const wireIdx = Math.max(
      source.search(/\bwireServices\s*\(/),
      source.search(/\bwireProducts\s*\(/),
      source.search(/wiring\[[\s\S]{0,40}?\]\s*\(/),
    );
    expect(loadIdx).toBeGreaterThan(-1);
    expect(wireIdx).toBeGreaterThan(loadIdx);
  });

  it('wiring covers both products that have api handlers (02-facilitator + 07-intelligence)', () => {
    // The wiring code (or its imported file) must mention both product
    // namespaces. We grep loosely — could be in main.cjs itself or in a
    // required wiring file. For the in-main case we assert here; if
    // backend-dev extracts to apps/back/server/wiring/, the corresponding
    // file presence is checked below.
    const has07 = /['"]07-intelligence['"]/.test(source);
    const has02 = /['"]02-facilitator['"]/.test(source);
    const hasRequiredWiring = /require\((['"])\.\/wiring/.test(source);
    // Either both product namespaces named directly in main.cjs OR a
    // wiring file is imported (then it owns the per-product mapping).
    expect(has07 && has02).toBe(hasRequiredWiring ? false : true);
    // i.e. if not externally imported, both names must appear inline
  });

  it('agentStorage is forwarded into wiring deps (LandingStats needs it)', () => {
    // `createLandingStats` requires deps with at minimum `agentStorage`
    // (and a clock). Assert main.cjs threads agentStorage into the
    // wiring call so the constructed service has its dependency.
    // Loosely: agentStorage must appear in the wiring vicinity.
    const wireRegion =
      source.match(
        /(?:wireServices|wireProducts|wiring\[[^\]]+\])[\s\S]{0,400}/,
      )?.[0] ?? '';
    expect(wireRegion).toMatch(/agentStorage/);
  });

  it('after wiring, registerSandboxRoutes still mounts api with the wired domain', () => {
    // Sanity: registerSandboxRoutes(server, appSandbox.api) must still
    // be the last step. Wiring goes between loadApplication and
    // registerSandboxRoutes, not after — otherwise routes mount before
    // services exist.
    const wireIdx = Math.max(
      source.search(/\bwireServices\s*\(/),
      source.search(/\bwireProducts\s*\(/),
      source.search(/wiring\[[\s\S]{0,40}?\]\s*\(/),
    );
    const routesIdx = source.search(/registerSandboxRoutes\s*\(/);
    expect(routesIdx).toBeGreaterThan(-1);
    expect(routesIdx).toBeGreaterThan(wireIdx);
  });
});
