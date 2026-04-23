// GET /api/landing/network/snapshot — 50-agent transaction graph. Poll 3000ms.
({
  httpMethod: 'GET',
  path: '/api/landing/network/snapshot',
  method: async () => {
    const result = await domain['07-intelligence'].landing.getNetworkSnapshot();
    if (!result.ok) {
      throw new errors.InternalError(result.error.message);
    }
    return result.value;
  },
});
