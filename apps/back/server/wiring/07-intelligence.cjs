'use strict';

// Wiring for FA-07 (Intelligence) domain.
//
// Converts the raw loader output into the service shape that api handlers
// expect (domain['07-intelligence'].landing).
//
// Loader nests by file stem: products/07-intelligence/app/domain/landing-stats.ts
// becomes rawDomain['landing-stats'] = { createLandingStats, ... }.
//
// Original 91c27ad impl read `rawDomain.createLandingStats` directly, missing
// the file-stem hop. Same crash-loop class as 02-facilitator (see comment
// there).

const wireIntelligenceDomain = (rawDomain, deps) => {
  const { createLandingStats } = rawDomain['landing-stats'];
  // agentStorage is threaded through from the composition root (main.cjs).
  return Object.freeze({ landing: createLandingStats(deps) });
};

module.exports = { wireIntelligenceDomain };
