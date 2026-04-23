'use strict';

// TD-01 fix: error codes sourced from compiled dist/ output.
//
// Strategy: tsconfig.app.json compiles packages/*/src/*.ts → dist/. The
// compiled .js files are plain CJS (tsconfig uses ESNext + bundler, but
// tsconfig.app.json has no "type":"module" and targets CJS via tsc).
// We CANNOT use createRequire('@paxio/types') — @paxio/types has
// "type":"module" in its package.json with no CJS dist, so Node.js resolves
// the ESM source which uses .js extension imports that don't exist as
// physical files.
//
// Instead: parse the compiled ERROR_CODES / ERROR_STATUS_CODES directly
// from the dist output (which has .js extensions resolved to actual .js
// files). This is the same data as @paxio/types, just from the compiled
// artifacts which CJS can safely require().

const path = require('node:path');

// Resolve dist/packages/types/src/errors.js — compiled output from tsconfig.app.json
// This is the canonical snapshot of @paxio/types ERROR_CODES and ERROR_STATUS_CODES.
const { ERROR_CODES, ERROR_STATUS_CODES } = (() => {
  const distErrorsPath = path.join(__dirname, '..', '..', '..', 'dist', 'packages', 'types', 'src', 'errors.js');
  try {
    return require(distErrorsPath);
  } catch {
    // Fallback: parse the dist/ index and walk to errors
    const distIndexPath = path.join(__dirname, '..', '..', '..', 'dist', 'packages', 'types', 'src', 'index.js');
    try {
      const distIndex = require(distIndexPath);
      // index.js does export * from './errors.js' — walk through it
      const errorsModule = require(path.join(__dirname, '..', '..', '..', 'dist', 'packages', 'types', 'src', 'errors.js'));
      return errorsModule;
    } catch {
      throw new Error('TD-01 FATAL: cannot resolve @paxio/types dist. Run `pnpm build` first.');
    }
  }
})();

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