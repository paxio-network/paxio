'use strict';

// Wiring for FA-07 (Intelligence) domain.
//
// Converts the raw loader output ({ createLandingStats }) into the
// service shape that api handlers expect (domain['07-intelligence'].landing).

const wireIntelligenceDomain = (rawDomain, deps) => {
  const { createLandingStats } = rawDomain;
  // agentStorage is threaded through from the composition root (main.cjs).
  return Object.freeze({ landing: createLandingStats(deps) });
};

module.exports = { wireIntelligenceDomain };
