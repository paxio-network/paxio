// POST /registry/claim/:did — claim flow.
//
// Two-step challenge/response:
//   - body absent (or { stage: 'challenge' }) → server issues a nonce
//   - body has { signature, publicKey, nonce } → server verifies the signature

({
  httpMethod: 'POST',
  path: '/registry/claim/:did',
  method: async ({ params, body }) => {
    const did = params && typeof params.did === 'string' ? params.did : '';
    if (did.length === 0) {
      throw new errors.ValidationError('path parameter "did" is required');
    }

    const hasProof =
      body &&
      typeof body === 'object' &&
      typeof body.signature === 'string' &&
      typeof body.publicKey === 'string' &&
      typeof body.nonce === 'string';

    if (!hasProof) {
      // Stage 1 — issue challenge.
      const result = await domain.registry.issueClaimChallenge(did);
      if (!result.ok) {
        if (result.error.code === 'not_found') {
          throw new errors.NotFoundError(result.error.message);
        }
        throw new errors.ValidationError(result.error.message);
      }
      return result.value;
    }

    // Stage 2 — verify proof.
    const proof = {
      did,
      nonce: body.nonce,
      signature: body.signature,
      publicKey: body.publicKey,
    };
    const result = await domain.registry.verifyClaim(proof);
    if (!result.ok) {
      if (result.error.code === 'claim_invalid_signature') {
        throw new errors.UnauthorizedError(result.error.message);
      }
      if (result.error.code === 'claim_expired') {
        throw new errors.ValidationError(result.error.message);
      }
      if (result.error.code === 'not_found') {
        throw new errors.NotFoundError(result.error.message);
      }
      throw new errors.ValidationError(result.error.message);
    }

    telemetry.broadcast('registry', {
      type: 'agent-claimed',
      did: result.value,
    });

    return {
      did: result.value,
      claimed: true,
      claimedAt: new Date().toISOString(),
    };
  },
});
