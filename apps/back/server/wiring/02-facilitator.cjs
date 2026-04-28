'use strict';

// Wiring for FA-02 (Facilitator) domain.
//
// Converts the raw loader output into the service shape that api handlers
// expect (domain['02-facilitator'].fap).
//
// Loader nests by file stem: products/02-facilitator/app/domain/fap-router.ts
// becomes rawDomain['fap-router'] = { createFapRouter, ... }.
//
// Original 91c27ad impl read `rawDomain.createFapRouter` directly, missing
// the file-stem hop. Result: TypeError "createFapRouter is not a function"
// at server startup → crash-loop → prod 502 (rolled back manually).

const wireFacilitatorDomain = (rawDomain, deps) => {
  const { createFapRouter } = rawDomain['fap-router'];
  return Object.freeze({ fap: createFapRouter(deps) });
};

module.exports = { wireFacilitatorDomain };
