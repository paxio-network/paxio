import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalError,
  RateLimitError,
  ExternalServiceError,
} from '@paxio/errors';
import { ERROR_CODES } from '@paxio/types';

describe('AppError base', () => {
  it('is an Error subclass', () => {
    const e = new InternalError('boom');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(AppError);
  });

  it('preserves message', () => {
    expect(new InternalError('boom').message).toBe('boom');
  });

  it('has stack trace', () => {
    expect(new InternalError('x').stack).toBeTruthy();
  });
});

describe('ValidationError', () => {
  it('has code validation_error and statusCode 400', () => {
    const e = new ValidationError('bad input');
    expect(e.code).toBe(ERROR_CODES.VALIDATION);
    expect(e.statusCode).toBe(400);
  });

  it('accepts context object', () => {
    const e = new ValidationError('bad did', { field: 'did' });
    expect(e.context).toEqual({ field: 'did' });
  });
});

describe('NotFoundError', () => {
  it('has statusCode 404', () => {
    expect(new NotFoundError('not here').statusCode).toBe(404);
  });
  it('has code not_found', () => {
    expect(new NotFoundError('x').code).toBe(ERROR_CODES.NOT_FOUND);
  });
});

describe('UnauthorizedError', () => {
  it('has statusCode 401', () => {
    expect(new UnauthorizedError('no token').statusCode).toBe(401);
  });
});

describe('ForbiddenError', () => {
  it('has statusCode 403', () => {
    expect(new ForbiddenError('not owner').statusCode).toBe(403);
  });
});

describe('ConflictError', () => {
  it('has statusCode 409', () => {
    expect(new ConflictError('already exists').statusCode).toBe(409);
  });
});

describe('RateLimitError', () => {
  it('has statusCode 429', () => {
    expect(new RateLimitError('slow down').statusCode).toBe(429);
  });
});

describe('InternalError', () => {
  it('has statusCode 500', () => {
    expect(new InternalError('boom').statusCode).toBe(500);
  });
});

describe('ExternalServiceError', () => {
  it('has statusCode 502', () => {
    expect(new ExternalServiceError('guard.paxio.network timeout').statusCode).toBe(502);
  });
});

describe('AppError.toJSON', () => {
  it('serializes code, message, statusCode, context', () => {
    const e = new ValidationError('bad', { field: 'did' });
    const json = e.toJSON();
    expect(json).toEqual({
      error: {
        code: ERROR_CODES.VALIDATION,
        message: 'bad',
        statusCode: 400,
        context: { field: 'did' },
      },
    });
  });

  it('omits context when null', () => {
    const e = new InternalError('boom');
    const json = e.toJSON();
    expect(json.error.context).toBeUndefined();
  });
});
