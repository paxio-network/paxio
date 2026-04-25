'use strict';

// Wiring for FA-02 (Facilitator) domain.
//
// Converts the raw loader output ({ createFapRouter }) into the
// service shape that api handlers expect (domain['02-facilitator'].fap).

const wireFacilitatorDomain = (rawDomain, deps) => {
  const { createFapRouter } = rawDomain;
  return Object.freeze({ fap: createFapRouter(deps) });
};

module.exports = { wireFacilitatorDomain };
