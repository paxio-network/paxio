// GET /api/landing/ticker — 3-lane ticker (INDICES / RAILS / ADOPTION). Poll 1100ms.
({
  httpMethod: 'GET',
  path: '/api/landing/ticker',
  method: async () => {
    const result = await domain['07-intelligence'].landing.getTickerLanes();
    if (!result.ok) {
      throw new errors.InternalError(result.error.message);
    }
    return result.value;
  },
});
