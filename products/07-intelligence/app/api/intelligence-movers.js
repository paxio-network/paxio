// GET /api/intelligence/movers — top gainers/losers + PAEI sparkline.
// Port: Movers (packages/interfaces/src/intelligence.ts).
// Query: window=1h|24h|7d|30d (default 24h). Public endpoint.
({
  httpMethod: 'GET',
  path: '/api/intelligence/movers',
  method: async ({ query }) => {
    const window = query?.window ?? '24h';
    // Validate enum membership
    if (!['1h', '24h', '7d', '30d'].includes(window)) {
      throw new errors.ValidationError(`invalid window: ${window}`);
    }
    const result = await domain.intelligence.getMovers(window);
    if (!result.ok) {
      if (result.error.code === 'invalid_window') {
        throw new errors.ValidationError(result.error.message);
      }
      throw new errors.InternalError(`movers: ${result.error.message}`);
    }
    return { data: result.value };
  },
});
