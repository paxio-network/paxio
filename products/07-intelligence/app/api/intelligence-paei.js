// GET /api/intelligence/paei/snapshot — live PAEI composite + subindices + adoption.
// Port: IntelligenceSnapshot (packages/interfaces/src/intelligence.ts).
// Public endpoint: no agentDid filter, aggregate over all agents.
({
  httpMethod: 'GET',
  path: '/api/intelligence/paei/snapshot',
  method: async () => {
    const result = await domain['07-intelligence'].intelligenceSnapshot.getPaeiSnapshot();
    if (!result.ok) {
      throw new errors.InternalError(`PAEI snapshot: ${result.error.message}`);
    }
    return { data: result.value };
  },
});
