// POST /registry/register — register a new Agent Card.
//
// Validates the request body against the Registry contract, then delegates to
// domain.registry.register(). On conflict returns 409, on validation_error 400.

({
  httpMethod: 'POST',
  path: '/registry/register',
  method: async ({ body }) => {
    if (!body || typeof body !== 'object') {
      throw new errors.ValidationError('request body must be an Agent Card object');
    }

    const result = await domain.registry.register(body);
    if (!result.ok) {
      if (result.error.code === 'conflict') {
        throw new errors.ConflictError(result.error.message);
      }
      throw new errors.ValidationError(result.error.message);
    }

    telemetry.broadcast('registry', {
      type: 'agent-registered',
      did: result.value,
    });

    return {
      _statusCode: 201,
      did: result.value,
      registered: true,
    };
  },
});
