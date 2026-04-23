// GET /api/landing/agents/top?limit=20 — top agents sorted by reputation.
// Validates limit: integer in range 1..100, throws ValidationError otherwise.
({
  httpMethod: 'GET',
  path: '/api/landing/agents/top',
  method: async ({ query }) => {
    const rawLimit = query?.limit;

    // Zod-style validation: must be integer 1..100
    if (rawLimit === undefined) {
      // fall through to default — no validation needed
    } else if (
      typeof rawLimit === 'number' &&
      Number.isInteger(rawLimit) &&
      rawLimit >= 1 &&
      rawLimit <= 100
    ) {
      // valid
    } else {
      throw new errors.ValidationError(
        typeof rawLimit === 'number'
          ? `limit must be between 1 and 100, got ${rawLimit}`
          : `limit must be an integer, got ${typeof rawLimit}`,
      );
    }

    const limit = typeof rawLimit === 'number' ? rawLimit : 20;
    const result = await domain['07-intelligence'].landing.getTopAgents(limit);
    if (!result.ok) {
      throw new errors.InternalError(result.error.message);
    }
    return result.value;
  },
});
