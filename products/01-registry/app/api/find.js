// GET /registry/find?intent=...&limit=N — semantic search across registered agents.
//
// MVP uses BM25 over Agent Card name+description (see domain/search.ts).
// Qdrant + embeddings come in M31.

({
  httpMethod: 'GET',
  path: '/registry/find',
  method: async ({ query }) => {
    const intent = query && typeof query.intent === 'string' ? query.intent.trim() : '';
    if (intent.length === 0) {
      throw new errors.ValidationError('query parameter "intent" is required');
    }

    let limit = 10;
    if (query && query.limit !== undefined) {
      const parsed = Number(query.limit);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
        throw new errors.ValidationError('limit must be an integer in [1, 100]');
      }
      limit = parsed;
    }

    const result = await domain.registry.find({ intent, limit });
    if (!result.ok) {
      throw new errors.AppError(result.error.message);
    }

    return {
      results: result.value,
      total: result.value.length,
    };
  },
});
