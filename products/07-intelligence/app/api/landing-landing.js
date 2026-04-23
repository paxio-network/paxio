// GET /api/landing — SSR one-shot: full landing payload.
({
  httpMethod: 'GET',
  path: '/api/landing/landing',
  method: async ({ query }) => {
    const result = await domain['07-intelligence'].landing.getLanding();
    if (!result.ok) {
      throw new errors.InternalError(result.error.message);
    }
    return result.value;
  },
});
