import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ERROR_CODES } from '@paxio/types';

// TD-01: server/lib/errors.cjs must stay in sync with @paxio/types.
//
// This test verifies by:
// 1. Loading @paxio/types via vitest's alias (tsconfig paths: src/index.ts)
// 2. Executing the CJS file in a VM sandbox with module resolution
// 3. Comparing the resulting class instances against @paxio/types values
//
// The CJS file reads from dist/ (compiled output from tsconfig.app.json).
// Both must agree — same source, same compiled snapshot.

describe('TD-01: CJS error mirror sync', () => {
  // Authoritative values from @paxio/types (single source of truth)
  // Imported directly via vitest alias → packages/types/src/errors.ts
  const EXPECTED_CODES = ERROR_CODES;

  const EXPECTED_STATUS_CODES: Record<string, number> = {
    validation_error: 400,
    unauthorized: 401,
    forbidden: 403,
    not_found: 404,
    conflict: 409,
    rate_limit: 429,
    internal_error: 500,
    external_service_error: 502,
  };

  let errorsModule: Record<string, unknown>;

  beforeAll(() => {
    const __filename = fileURLToPath(import.meta.url);
    const __testDir = dirname(__filename);
    const cjsPath = resolve(__testDir, '..', 'apps/back/server/lib/errors.cjs');

    const cjsSource = readFileSync(cjsPath, 'utf8');

    // Pass the correct __dirname so the CJS file can resolve dist/ path
    const serverLibDir = resolve(__testDir, '..', 'apps/back/server');

    const wrappedCode = `
      (function(__dirname) {
        ${cjsSource}
        return module.exports;
      })
    `;

    const fn = eval(wrappedCode);
    const exports = fn(serverLibDir);
    errorsModule = exports;
  });

  const buildTest = (clsName: string, expectedCode: string, expectedStatus: number) => {
    it(`${clsName} code = '${expectedCode}' and status = ${expectedStatus}`, () => {
      const cls = errorsModule[clsName] as new (msg: string) => Error & { code: string; statusCode: number; name: string };
      expect(cls).toBeDefined();
      expect(typeof cls).toBe('function');

      const instance = new cls('test message');
      expect(instance.code).toBe(expectedCode);
      expect(instance.statusCode).toBe(expectedStatus);
      expect(instance.name).toBe(clsName);
    });
  };

  buildTest('ValidationError', EXPECTED_CODES.VALIDATION, EXPECTED_STATUS_CODES.validation_error);
  buildTest('NotFoundError',     EXPECTED_CODES.NOT_FOUND,     EXPECTED_STATUS_CODES.not_found);
  buildTest('UnauthorizedError', EXPECTED_CODES.UNAUTHORIZED, EXPECTED_STATUS_CODES.unauthorized);
  buildTest('ForbiddenError',    EXPECTED_CODES.FORBIDDEN,    EXPECTED_STATUS_CODES.forbidden);
  buildTest('ConflictError',     EXPECTED_CODES.CONFLICT,     EXPECTED_STATUS_CODES.conflict);
  buildTest('RateLimitError',    EXPECTED_CODES.RATE_LIMIT,   EXPECTED_STATUS_CODES.rate_limit);
  buildTest('InternalError',     EXPECTED_CODES.INTERNAL,     EXPECTED_STATUS_CODES.internal_error);
  buildTest('ExternalServiceError', EXPECTED_CODES.EXTERNAL_SERVICE, EXPECTED_STATUS_CODES.external_service_error);

  describe('module.exports completeness', () => {
    it('exports all 9 error classes', () => {
      const expected = [
        'AppError',
        'ValidationError',
        'NotFoundError',
        'UnauthorizedError',
        'ForbiddenError',
        'ConflictError',
        'RateLimitError',
        'InternalError',
        'ExternalServiceError',
      ];
      for (const cls of expected) {
        expect(errorsModule).toHaveProperty(cls);
        expect(typeof errorsModule[cls]).toBe('function');
      }
    });

    it('does NOT export extra classes beyond the 9 defined', () => {
      const exportedKeys = Object.keys(errorsModule).filter(
        (k) => typeof errorsModule[k] === 'function',
      );
      // We expect exactly 9 (AppError base + 8 subclasses)
      expect(exportedKeys).toHaveLength(9);
    });
  });

  describe('AppError.toJSON consistency', () => {
    it('toJSON output matches RFC 7807-lite shape', () => {
      const ValidationError = errorsModule.ValidationError as new (msg: string) => {
        toJSON: () => Record<string, unknown>;
        code: string;
        statusCode: number;
        message: string;
      };
      const e = new ValidationError('bad input');
      const json = e.toJSON();
      expect(json).toHaveProperty('error');
      expect(json.error).toHaveProperty('code', EXPECTED_CODES.VALIDATION);
      expect(json.error).toHaveProperty('message', 'bad input');
      expect(json.error).toHaveProperty('statusCode', EXPECTED_STATUS_CODES.validation_error);
    });

    it('toJSON omits context when null', () => {
      const InternalError = errorsModule.InternalError as new (msg: string) => {
        toJSON: () => Record<string, unknown>;
      };
      const e = new InternalError('boom');
      const json = e.toJSON();
      expect(json.error).not.toHaveProperty('context');
    });

    it('toJSON includes context when provided', () => {
      const ValidationError = errorsModule.ValidationError as new (
        msg: string,
        ctx: Record<string, unknown> | null,
      ) => { toJSON: () => Record<string, unknown> };
      const e = new ValidationError('bad', { field: 'did' });
      const json = e.toJSON();
      expect(json.error).toHaveProperty('context', { field: 'did' });
    });
  });
});