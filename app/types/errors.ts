// Error codes — domain constants.
// AppError class hierarchy (implementation) lives in app/errors/.
// Server-side CommonJS mirror: server/lib/errors.cjs — codes MUST match.

export const ERROR_CODES = {
  VALIDATION: 'validation_error',
  NOT_FOUND: 'not_found',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  CONFLICT: 'conflict',
  INTERNAL: 'internal_error',
  EXTERNAL_SERVICE: 'external_service_error',
  RATE_LIMIT: 'rate_limit',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// HTTP status code mapping. Kept close to codes for single source of truth.
export const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  validation_error: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limit: 429,
  internal_error: 500,
  external_service_error: 502,
};
