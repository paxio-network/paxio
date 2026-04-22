// GET /api/landing/agents/top?limit=20 — top agents sorted by reputation.
({
  httpMethod: 'GET',
  path: '/api/landing/agents/top',
  method: async ({ query }) => {
    const limit = typeof query?.limit === 'number' ? query.limit : 20;
    const result = await domain['07-intelligence'].landing.getTopAgents(limit);
    if (!result.ok) {
      throw new errors.InternalError(result.error.message);
    }
    return result.value;
  },
});
