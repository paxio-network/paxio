// GET /registry/:did — resolve an Agent Card by its DID.

({
  httpMethod: 'GET',
  path: '/registry/:did',
  method: async ({ params }) => {
    const did = params && typeof params.did === 'string' ? params.did : '';
    if (did.length === 0) {
      throw new errors.ValidationError('path parameter "did" is required');
    }

    const result = await domain.registry.resolve(did);
    if (!result.ok) {
      if (result.error.code === 'not_found') {
        throw new errors.NotFoundError(result.error.message);
      }
      throw new errors.ValidationError(result.error.message);
    }

    return { card: result.value };
  },
});
