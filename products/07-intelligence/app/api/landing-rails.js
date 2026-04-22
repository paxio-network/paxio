// GET /api/landing/rails — payment rail distribution. Poll 60s.
({
  httpMethod: 'GET',
  path: '/api/landing/rails',
  method: async () => {
    const result = await domain['07-intelligence'].landing.getRails();
    if (!result.ok) {
      throw new errors.InternalError(result.error.message);
    }
    return result.value;
  },
});
