// GET /registry/count — total number of registered agents.

({
  httpMethod: 'GET',
  path: '/registry/count',
  method: async () => {
    const count = await domain.registry.count();
    return { count };
  },
});
