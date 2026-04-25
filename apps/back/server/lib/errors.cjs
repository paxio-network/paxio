'use strict';

// TD-14 fix: inline CJS mirror of @paxio/types ERROR_CODES + ERROR_STATUS_CODES.
//
// Previous implementation (TD-01 fix, commit bab66c0) required `pnpm build`
// before server start because it did `require('../../../dist/packages/types/src/errors.js')`
// — hardcoded relative path into compiled dist output. Three problems fixed here:
//   (1) deploy coupling — server now boots without pre-built dist/
//   (2) path fragility — no hardcoded dist/ path
//   (3) dead fallback — old try/catch had two identical require() calls
//
// Drift risk is handled at test-time: tests/errors-cjs-sync.test.ts imports
// `@paxio/types` through the vitest TS alias and compares against this
// file's exports. If either side changes, the test fails (5ms drift check).
//
// Canonical HTTP status codes are RFC 7235 — they are stable by standard,
// not by our version. Inlining is architecturally correct.

const ERROR_CODES = Object.freeze({
  VALIDATION: 'validation_error',
  NOT_FOUND: 'not_found',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  CONFLICT: 'conflict',
  INTERNAL: 'internal_error',
  EXTERNAL_SERVICE: 'external_service_error',
  RATE_LIMIT: 'rate_limit',
});

const ERROR_STATUS_CODES = Object.freeze({
  validation_error: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limit: 429,
  internal_error: 500,
  external_service_error: 502,
});

class AppError extends Error {
  constructor(code, message, statusCode = 500, context = null) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.name = 'AppError';
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        ...(this.context ? { context: this.context } : {}),
      },
    };
  }
}

class ValidationError extends AppError {
  constructor(message, context = null) {
    super(ERROR_CODES.VALIDATION, message, ERROR_STATUS_CODES.validation_error, context);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(message, context = null) {
    super(ERROR_CODES.NOT_FOUND, message, ERROR_STATUS_CODES.not_found, context);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Not authenticated', context = null) {
    super(ERROR_CODES.UNAUTHORIZED, message, ERROR_STATUS_CODES.unauthorized, context);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', context = null) {
    super(ERROR_CODES.FORBIDDEN, message, ERROR_STATUS_CODES.forbidden, context);
    this.name = 'ForbiddenError';
  }
}

class ConflictError extends AppError {
  constructor(message, context = null) {
    super(ERROR_CODES.CONFLICT, message, ERROR_STATUS_CODES.conflict, context);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', context = null) {
    super(ERROR_CODES.RATE_LIMIT, message, ERROR_STATUS_CODES.rate_limit, context);
    this.name = 'RateLimitError';
  }
}

class InternalError extends AppError {
  constructor(message, context = null) {
    super(ERROR_CODES.INTERNAL, message, ERROR_STATUS_CODES.internal_error, context);
    this.name = 'InternalError';
  }
}

class ExternalServiceError extends AppError {
  constructor(message, context = null) {
    super(ERROR_CODES.EXTERNAL_SERVICE, message, ERROR_STATUS_CODES.external_service_error, context);
    this.name = 'ExternalServiceError';
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  InternalError,
  ExternalServiceError,
};
