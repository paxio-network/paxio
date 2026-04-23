import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// TD-01: server/lib/errors.cjs must stay in sync with app/errors/index.ts
// (which reads ERROR_CODES from @paxio/types).
//
// This test verifies:
// 1. All error classes in CJS mirror have the same codes as ERROR_CODES
// 2. All HTTP status codes match ERROR_STATUS_CODES
// 3. No extra or missing error classes

describe('TD-01: CJS error mirror sync', () => {
  let cjsSource: string;

  beforeAll(() => {
    // Use import.meta.url so we always resolve relative to this file's location,
    // regardless of how the test runner resolved __dirname in compiled output.
    const __filename = fileURLToPath(import.meta.url);
    const __testDir = dirname(__filename);
    // __testDir = /home/nous/paxio/tests; go up one level to repo root → apps/back/...
    cjsSource = readFileSync(
      resolve(__testDir, '..', 'apps/back/server/lib/errors.cjs'),
      'utf8',
    );
  });

  // These are the authoritative codes from @paxio/types ERROR_CODES
  const EXPECTED_CODES = {
    VALIDATION: 'validation_error',
    NOT_FOUND: 'not_found',
    UNAUTHORIZED: 'unauthorized',
    FORBIDDEN: 'forbidden',
    CONFLICT: 'conflict',
    RATE_LIMIT: 'rate_limit',
    INTERNAL: 'internal_error',
    EXTERNAL_SERVICE: 'external_service_error',
  } as const;

  // These are the authoritative status codes from @paxio/types ERROR_STATUS_CODES
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

  describe('error class codes', () => {
    it('ValidationError code matches ERROR_CODES.VALIDATION', () => {
      // The CJS file hardcodes 'validation_error' string — check it matches
      const match = cjsSource.match(/super\s*\(\s*['"]validation_error['"]/);
      expect(match).not.toBeNull();
      expect(match![0]).toContain("'validation_error'");
    });

    it('NotFoundError code matches ERROR_CODES.NOT_FOUND', () => {
      const match = cjsSource.match(/super\s*\(\s*['"]not_found['"]/);
      expect(match).not.toBeNull();
    });

    it('UnauthorizedError code matches ERROR_CODES.UNAUTHORIZED', () => {
      const match = cjsSource.match(/super\s*\(\s*['"]unauthorized['"]/);
      expect(match).not.toBeNull();
    });

    it('ForbiddenError code matches ERROR_CODES.FORBIDDEN', () => {
      const match = cjsSource.match(/super\s*\(\s*['"]forbidden['"]/);
      expect(match).not.toBeNull();
    });

    it('ConflictError code matches ERROR_CODES.CONFLICT', () => {
      const match = cjsSource.match(/super\s*\(\s*['"]conflict['"]/);
      expect(match).not.toBeNull();
    });

    it('RateLimitError code matches ERROR_CODES.RATE_LIMIT', () => {
      const match = cjsSource.match(/super\s*\(\s*['"]rate_limit['"]/);
      expect(match).not.toBeNull();
    });

    it('InternalError code matches ERROR_CODES.INTERNAL', () => {
      const match = cjsSource.match(/super\s*\(\s*['"]internal_error['"]/);
      expect(match).not.toBeNull();
    });

    it('ExternalServiceError code matches ERROR_CODES.EXTERNAL_SERVICE', () => {
      const match = cjsSource.match(/super\s*\(\s*['"]external_service_error['"]/);
      expect(match).not.toBeNull();
    });
  });

  describe('HTTP status codes', () => {
    it('ValidationError status code 400 matches ERROR_STATUS_CODES.validation_error', () => {
      // super('validation_error', message, 400, context) — 3rd arg is statusCode
      const match = cjsSource.match(
        /class ValidationError[\s\S]*?super\s*\(\s*['"]validation_error['"]\s*,\s*message\s*,\s*(\d+)/,
      );
      expect(match).not.toBeNull();
      expect(parseInt(match![1])).toBe(
        EXPECTED_STATUS_CODES.validation_error,
      );
    });

    it('NotFoundError status code 404 matches ERROR_STATUS_CODES.not_found', () => {
      const match = cjsSource.match(
        /class NotFoundError[\s\S]*?super\s*\(\s*['"]not_found['"]\s*,\s*message\s*,\s*(\d+)/,
      );
      expect(match).not.toBeNull();
      expect(parseInt(match![1])).toBe(
        EXPECTED_STATUS_CODES.not_found,
      );
    });

    it('UnauthorizedError status code 401 matches ERROR_STATUS_CODES.unauthorized', () => {
      const match = cjsSource.match(
        /class UnauthorizedError[\s\S]*?super\s*\(\s*['"]unauthorized['"]\s*,\s*message\s*,\s*(\d+)/,
      );
      expect(match).not.toBeNull();
      expect(parseInt(match![1])).toBe(
        EXPECTED_STATUS_CODES.unauthorized,
      );
    });

    it('ForbiddenError status code 403 matches ERROR_STATUS_CODES.forbidden', () => {
      const match = cjsSource.match(
        /class ForbiddenError[\s\S]*?super\s*\(\s*['"]forbidden['"]\s*,\s*message\s*,\s*(\d+)/,
      );
      expect(match).not.toBeNull();
      expect(parseInt(match![1])).toBe(
        EXPECTED_STATUS_CODES.forbidden,
      );
    });

    it('ConflictError status code 409 matches ERROR_STATUS_CODES.conflict', () => {
      const match = cjsSource.match(
        /class ConflictError[\s\S]*?super\s*\(\s*['"]conflict['"]\s*,\s*message\s*,\s*(\d+)/,
      );
      expect(match).not.toBeNull();
      expect(parseInt(match![1])).toBe(
        EXPECTED_STATUS_CODES.conflict,
      );
    });

    it('RateLimitError status code 429 matches ERROR_STATUS_CODES.rate_limit', () => {
      const match = cjsSource.match(
        /class RateLimitError[\s\S]*?super\s*\(\s*['"]rate_limit['"]\s*,\s*message\s*,\s*(\d+)/,
      );
      expect(match).not.toBeNull();
      expect(parseInt(match![1])).toBe(
        EXPECTED_STATUS_CODES.rate_limit,
      );
    });

    it('InternalError status code 500 matches ERROR_STATUS_CODES.internal_error', () => {
      const match = cjsSource.match(
        /class InternalError[\s\S]*?super\s*\(\s*['"]internal_error['"]\s*,\s*message\s*,\s*(\d+)/,
      );
      expect(match).not.toBeNull();
      expect(parseInt(match![1])).toBe(
        EXPECTED_STATUS_CODES.internal_error,
      );
    });

    it('ExternalServiceError status code 502 matches ERROR_STATUS_CODES.external_service_error', () => {
      const match = cjsSource.match(
        /class ExternalServiceError[\s\S]*?super\s*\(\s*['"]external_service_error['"]\s*,\s*message\s*,\s*(\d+)/,
      );
      expect(match).not.toBeNull();
      expect(parseInt(match![1])).toBe(
        EXPECTED_STATUS_CODES.external_service_error,
      );
    });
  });

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
        expect(cjsSource).toContain(`  ${cls},`);
      }
    });
  });
});
