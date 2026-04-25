'use strict';

// Per-product wiring aggregator.
//
// Pattern: composition root (engineering-principles §16).  Each product's
// wiring file receives its raw domain object (factories from the VM loader)
// plus deps and returns the CONSTRUCTED service namespace.  wireProducts()
// merges them back into the loaded domain tree so api handlers find their
// expected slots (e.g. domain['07-intelligence'].landing.getHero()).

const { wireFacilitatorDomain } = require('./02-facilitator.cjs');
const { wireIntelligenceDomain } = require('./07-intelligence.cjs');

const wireProducts = (rawDomain, deps) => {
  // FA-02 — Facilitator
  if (rawDomain['02-facilitator']) {
    rawDomain['02-facilitator'] = wireFacilitatorDomain(
      rawDomain['02-facilitator'],
      deps,
    );
  }

  // FA-07 — Intelligence
  if (rawDomain['07-intelligence']) {
    rawDomain['07-intelligence'] = wireIntelligenceDomain(
      rawDomain['07-intelligence'],
      deps,
    );
  }

  return rawDomain;
};

module.exports = { wireProducts };
