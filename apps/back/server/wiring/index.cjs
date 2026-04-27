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
const { wireRegistryDomain } = require('./01-registry.cjs');

// rawDomain is double-frozen by the VM loader:
//   sandbox.domain = Object.freeze(domain);                     ← outer frozen
//   domain[product] = Object.freeze(productDomain);             ← inner frozen
//
// 91c27ad's impl tried to mutate `rawDomain['<product>'] = ...` which throws
// in strict mode ("Cannot assign to read only property"). Fix: build NEW
// frozen objects (preserving raw factory exports as siblings of the wired
// service slots, so any future code that wants to call createXxx directly
// can still find it). Caller (main.cjs) is responsible for swapping the
// returned object into sandbox.domain so api handlers pick up the wiring.
const wireProducts = (rawDomain, deps) => {
  const wired = { ...rawDomain };

  // FA-02 — Facilitator
  if (rawDomain['02-facilitator']) {
    wired['02-facilitator'] = Object.freeze({
      ...rawDomain['02-facilitator'],
      ...wireFacilitatorDomain(rawDomain['02-facilitator'], deps),
    });
  }

  // FA-07 — Intelligence
  if (rawDomain['07-intelligence']) {
    wired['07-intelligence'] = Object.freeze({
      ...rawDomain['07-intelligence'],
      ...wireIntelligenceDomain(rawDomain['07-intelligence'], deps),
    });
  }

  // FA-01 — Registry (crawler domain)
  if (rawDomain['01-registry']) {
    wired['01-registry'] = Object.freeze({
      ...rawDomain['01-registry'],
      ...wireRegistryDomain(rawDomain['01-registry'], deps),
    });
  }

  return Object.freeze(wired);
};

module.exports = { wireProducts };
