// AppError hierarchy — Paxio domain-level error types.
// Codes come from app/types/errors.ts (ERROR_CODES).
// HTTP status codes from app/types/errors.ts (ERROR_STATUS_CODES).
// Server-side CommonJS mirror: server/lib/errors.cjs (must stay in sync).

import {
  ERROR_CODES,
  ERROR_STATUS_CODES,
  type ErrorCode,
} from 'app/types/errors.js';

// Shape of toJSON() output.
// Follows RFC 7807-lite: top-level `error` wrapper with code + message + statusCode.
interface SerializedError {
  error: {
    code: ErrorCode;
    message: string;
    statusCode: number;
    context?: Record<string, unknown>;
  };
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly context: Record<string, unknown> | null;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    context: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.name = 'AppError';
    // Preserve prototype chain for instanceof across bundlers/targets
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): SerializedError {
    const inner: SerializedError['error'] = {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
    if (this.context) inner.context = this.context;
    return { error: inner };
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    context: Record<string, unknown> | null = null,
  ) {
    super(
      ERROR_CODES.VALIDATION,
      message,
      ERROR_STATUS_CODES.validation_error,
      context,
    );
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(
    message: string,
    context: Record<string, unknown> | null = null,
  ) {
    super(
      ERROR_CODES.NOT_FOUND,
      message,
      ERROR_STATUS_CODES.not_found,
      context,
    );
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    message = 'Not authenticated',
    context: Record<string, unknown> | null = null,
  ) {
    super(
      ERROR_CODES.UNAUTHORIZED,
      message,
      ERROR_STATUS_CODES.unauthorized,
      context,
    );
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message = 'Forbidden',
    context: Record<string, unknown> | null = null,
  ) {
    super(
      ERROR_CODES.FORBIDDEN,
      message,
      ERROR_STATUS_CODES.forbidden,
      context,
    );
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string,
    context: Record<string, unknown> | null = null,
  ) {
    super(ERROR_CODES.CONFLICT, message, ERROR_STATUS_CODES.conflict, context);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(
    message = 'Rate limit exceeded',
    context: Record<string, unknown> | null = null,
  ) {
    super(
      ERROR_CODES.RATE_LIMIT,
      message,
      ERROR_STATUS_CODES.rate_limit,
      context,
    );
    this.name = 'RateLimitError';
  }
}

export class InternalError extends AppError {
  constructor(
    message: string,
    context: Record<string, unknown> | null = null,
  ) {
    super(
      ERROR_CODES.INTERNAL,
      message,
      ERROR_STATUS_CODES.internal_error,
      context,
    );
    this.name = 'InternalError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    message: string,
    context: Record<string, unknown> | null = null,
  ) {
    super(
      ERROR_CODES.EXTERNAL_SERVICE,
      message,
      ERROR_STATUS_CODES.external_service_error,
      context,
    );
    this.name = 'ExternalServiceError';
  }
}
