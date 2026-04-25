// GET /api/fap/rails — return the canonical FAP rails catalog (M-L4a).
//
// Public endpoint (no tenant filter): the rails catalog is a global
// marketing surface, identical for every caller.
({
  httpMethod: 'GET',
  path: '/api/fap/rails',
  method: async () => {
    const result = await domain['02-facilitator'].fap.getRails();
    if (!result.ok) {
      throw new errors.InternalError(result.error.message);
    }
    return result.value;
  },
});
