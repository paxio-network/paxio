'use strict';

// Wiring for FA-07 (Intelligence) domain.
//
// Combines domain factories from the VM loader with stub/real adapters
// from infrastructure/ to produce the service shape that api handlers
// expect (domain['07-intelligence'].landing, .intelligenceSnapshot, .movers).
//
// Loader nests by file stem: products/07-intelligence/app/domain/<file>.ts
// becomes rawDomain['<file-stem>'] = { createXxx, ... }.
//
// W-1.1: extended from landing-only (M-L8) to also wire intelligenceSnapshot
//   and movers so handlers shipped in Phase 5 actually have a domain impl.
// W-1.2..1.4: adapters supplied from infrastructure/ stubs (FA-01 M-L1-impl
//   replaces with real Postgres/Redis implementations).

const okZero = async () => ({ ok: true, value: 0 });

const wireIntelligenceDomain = (rawDomain, deps) => {
  const { createLandingStats } = rawDomain['landing-stats'];
  const { createIntelligenceSnapshot } = rawDomain['intelligence-snapshot'];
  const { createMovers } = rawDomain['movers'];

  return Object.freeze({
    // ── W-1.1: landing (M-L8 lineage) ──────────────────────────────────────
    landing: createLandingStats({
      agentStorage: deps.agentStorage,
      clock: () => Date.now(),
      // getRegistryCount: real count via agentStorage.count() now that
      // FA-01 crawler upserts records into agent_cards. Returns Result
      // matching the LandingStats signature; falls back to ok(0) on DB
      // errors per "zero is real data" invariant.
      getRegistryCount: deps.agentStorage
        ? async () => {
            const r = await deps.agentStorage.count();
            return r.ok ? r : { ok: true, value: 0 };
          }
        : okZero,
      // Audit / Guard zero-fallbacks remain — wire through when their
      // respective infra clients land.
      getAuditCount24h: okZero,
      getGuardAttacks24h: okZero,
    }),

    // ── W-1.1: intelligenceSnapshot ───────────────────────────────────────
    // Wire factories with stub adapters. M-L1-impl marker in each stub
    // signals replacement walker to swap with Postgres-backed repos.
    intelligenceSnapshot: createIntelligenceSnapshot({
      agentMetricsRepo: deps.agentMetricsRepo,
      cache: deps.cache,
      clock: { now: () => Date.now() },
    }),

    // ── W-1.1: movers ──────────────────────────────────────────────────────
    movers: createMovers({
      moversRepo: deps.moversRepo,
      cache: deps.cache,
      clock: { now: () => Date.now() },
    }),
  });
};

module.exports = { wireIntelligenceDomain };
