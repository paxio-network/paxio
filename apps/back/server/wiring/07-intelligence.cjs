'use strict';

// Wiring for FA-07 (Intelligence) domain.
//
// Converts the raw loader output into the service shape that api handlers
// expect (domain['07-intelligence'].landing).
//
// Loader nests by file stem: products/07-intelligence/app/domain/landing-stats.ts
// becomes rawDomain['landing-stats'] = { createLandingStats, ... }.
//
// `createLandingStats` requires three upstream-data callbacks plus a clock.
// Until Registry / Audit / Guard integrations land (M-L9+), every callback
// returns `ok(0)` so /api/landing/hero serves the real-empty zero state
// (M-L8 invariant: "zero is real data" — never fake numbers in render).
// agentStorage is forwarded for the network-snapshot path which DOES read
// from the registry table directly.

const okZero = async () => ({ ok: true, value: 0 });

const wireIntelligenceDomain = (rawDomain, deps) => {
  const { createLandingStats } = rawDomain['landing-stats'];
  return Object.freeze({
    landing: createLandingStats({
      agentStorage: deps.agentStorage,
      clock: () => Date.now(),
      // Zero-fallback callbacks — replaced when Registry/Audit/Guard wire
      // through in their respective FA milestones. Until then handlers
      // serve real-empty state (agents=0, txns=0, attacks24=0) via these.
      getRegistryCount: okZero,
      getAuditCount24h: okZero,
      getGuardAttacks24h: okZero,
    }),
  });
};

module.exports = { wireIntelligenceDomain };
