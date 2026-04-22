// GET /api/landing/hero — live hero strip (14 fields + indices). Poll 1100ms.
({
  httpMethod: 'GET',
  path: '/api/landing/hero',
  method: async () => {
    const result = await domain['07-intelligence'].landing.getHero();
    if (!result.ok) {
      throw new errors.InternalError(result.error.message);
    }
    return result.value;
  },
});
