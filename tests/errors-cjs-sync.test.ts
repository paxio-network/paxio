import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ERROR_CODES } from '@paxio/types';

// TD-01 / TD-14 / TD-15 — drift guard for server/lib/errors.cjs.
//
// Invariant: apps/back/server/lib/errors.cjs and packages/types/src/errors.ts
// MUST agree on ERROR_CODES values and HTTP status codes. Server runtime uses
// the .cjs file (it runs under plain Node CJS before the VM sandbox starts);
// the TS side is the authoritative single source of truth.
//
// History:
//  - TD-01 (initial): .cjs file and TS file duplicated constants, drift risk.
//    This test introduced.
//  - TD-14: .cjs file was briefly made to `require()` a compiled dist/ path,
//    which coupled deploys to `pnpm build`. Rolled back to inline constants
//    protected by this drift guard.
//  - TD-15: this test used `eval(wrappedCode)` with a fake __dirname to make
//    the old dist/-require resolve. After TD-14 there is no dist/ require —
//    the .cjs file is self-contained. Replaced eval with `createRequire()`
//    which is the standard Node API for loading CJS from ESM test files
//    (also satisfies safety.md::No Dynamic Code Execution).

describe('TD-01: CJS error mirror sync', () => {
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
    const cjsPath = resolve(
      __testDir,
      '..',
      'apps/back/server/lib/errors.cjs',
    );

    // Standard Node API for loading a CJS module from an ESM context.
    // Resolution is relative to the import.meta.url passed in. No eval.
    const require = createRequire(import.meta.url);
    errorsModule = require(cjsPath) as Record<string, unknown>;
  });

  const buildTest = (clsName: string, expectedCode: string, expectedStatus: number) => {
    it(`${clsName} code = '${expectedCode}' and status = ${expectedStatus}`, () => {
      const cls = errorsModule[clsName] as new (msg: string) => Error & {
        code: string;
        statusCode: number;
        name: string;
      };
      expect(cls).toBeDefined();
      expect(typeof cls).toBe('function');

      const instance = new cls('test message');
      expect(instance.code).toBe(expectedCode);
      expect(instance.statusCode).toBe(expectedStatus);
      expect(instance.name).toBe(clsName);
    });
  };

  buildTest('ValidationError', EXPECTED_CODES.VALIDATION, EXPECTED_STATUS_CODES.validation_error);
  buildTest('NotFoundError', EXPECTED_CODES.NOT_FOUND, EXPECTED_STATUS_CODES.not_found);
  buildTest('UnauthorizedError', EXPECTED_CODES.UNAUTHORIZED, EXPECTED_STATUS_CODES.unauthorized);
  buildTest('ForbiddenError', EXPECTED_CODES.FORBIDDEN, EXPECTED_STATUS_CODES.forbidden);
  buildTest('ConflictError', EXPECTED_CODES.CONFLICT, EXPECTED_STATUS_CODES.conflict);
  buildTest('RateLimitError', EXPECTED_CODES.RATE_LIMIT, EXPECTED_STATUS_CODES.rate_limit);
  buildTest('InternalError', EXPECTED_CODES.INTERNAL, EXPECTED_STATUS_CODES.internal_error);
  buildTest(
    'ExternalServiceError',
    EXPECTED_CODES.EXTERNAL_SERVICE,
    EXPECTED_STATUS_CODES.external_service_error,
  );

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
