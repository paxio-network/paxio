// GET /api/landing/heatmap — threat heatmap 6×6 for last 24h. Poll 60s.
({
  httpMethod: 'GET',
  path: '/api/landing/heatmap',
  method: async () => {
    const result = await domain['07-intelligence'].landing.getHeatmap();
    if (!result.ok) {
      throw new errors.InternalError(result.error.message);
    }
    return result.value;
  },
});
