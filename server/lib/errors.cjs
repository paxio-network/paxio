'use strict';

// CommonJS AppError hierarchy for server/ layer.
// Mirrors app/errors/ (TypeScript) for sandbox use — these are injected into VM context.
// Error codes MUST match app/types/errors.ts ERROR_CODES.

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
    super('validation_error', message, 400, context);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(message, context = null) {
    super('not_found', message, 404, context);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Not authenticated', context = null) {
    super('unauthorized', message, 401, context);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', context = null) {
    super('forbidden', message, 403, context);
    this.name = 'ForbiddenError';
  }
}

class ConflictError extends AppError {
  constructor(message, context = null) {
    super('conflict', message, 409, context);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', context = null) {
    super('rate_limit', message, 429, context);
    this.name = 'RateLimitError';
  }
}

class InternalError extends AppError {
  constructor(message, context = null) {
    super('internal_error', message, 500, context);
    this.name = 'InternalError';
  }
}

class ExternalServiceError extends AppError {
  constructor(message, context = null) {
    super('external_service_error', message, 502, context);
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
